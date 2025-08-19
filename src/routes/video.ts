// Video Generation Routes
// Clean, focused video generation endpoints

import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Store video generation status in memory for testing
const videoStatuses: { [videoId: string]: {
  status: string;
  progress: number;
  message: string;
  outputPath?: string;
  videoUrl?: string; // Added for WebSocket real-time progress
  error?: string;
  sizeInBytes?: number;
  duration?: number;
} } = {};

// Lambda video generation function using maximum performance Lambda
async function generateVideoAsync(videoId: string, type: string, input: any, settings: any, socketId?: string) {
  try {
    console.log(`[VideoGen] Starting Lambda video generation for ${videoId}`);
    videoStatuses[videoId] = { status: 'processing', progress: 5, message: 'Initializing Lambda service...' };
    
    // ✅ FIXED: Emit initial status via WebSocket to frontend
    const io = (global as any).io;
    if (io && socketId) {
      const initialData = {
        videoId,
        progress: 5,
        phase: 'initializing',
        message: 'Initializing Lambda service...',
        timestamp: new Date().toISOString()
      };
      console.log(`[VideoGen] Emitting initial status to socket ${socketId}:`, initialData);
      io.to(socketId).emit('videoProgress', initialData);
    }

    // Import the simplified Lambda service for maximum performance
    const { simpleLambdaService } = await import('../services/simpleLambdaService');
    
    // ✅ ENHANCED: Intelligent background video preprocessing
    if (input?.config?.backgroundSettings?.backgroundType === 'video' && input?.config?.backgroundSettings?.backgroundUrl) {
      const backgroundSettings = input.config.backgroundSettings;
      const videoUrl = backgroundSettings.backgroundUrl;
      const videoStartTime = backgroundSettings.videoStartTime || 0;
      const videoEndTime = backgroundSettings.videoEndTime || (settings.duration || 30);
      const videoDurationInSeconds = settings.duration || 30;
      
      console.log(`[VideoGen] Preprocessing background video: ${videoUrl}`);
      console.log(`[VideoGen] Segment: ${videoStartTime}s - ${videoEndTime}s (${videoEndTime - videoStartTime}s)`);
      
      // TEMPORARILY DISABLE PREPROCESSING TO TEST BACKGROUND VIDEOS
      console.log(`[VideoGen] PREPROCESSING DISABLED - Using original video directly`);
      console.log(`[VideoGen] Video URL: ${videoUrl}`);
      console.log(`[VideoGen] Segment: ${videoStartTime}s - ${videoEndTime}s`);
      console.log(`[VideoGen] Video background will be rendered as-is`);
      
      // Keep original settings - no preprocessing
      // This will test if preprocessing was causing the background video issue
    }

    // Prepare Lambda render request - match video service expected format
    const lambdaRequest = {
      id: videoId,
      inputProps: {
        // The video service expects a 'config' object with messages, not flat props
        config: input.config || {
          messages: input.conversations?.[0]?.messages || [
            {
              id: '1',
              text: input.text || input.script || 'Default video content',
              from: 'sender',
              duration: 2
            }
          ],
          messageMetadata: input.messageMetadata || {
            username: 'User',
            pfp: '',
            darkMode: false,
            unreadMessages: '0',
            ui: 'iOS Dark'
          },
          durationInSeconds: settings.duration || 30
        }
      },
      fileName: `${videoId}.mp4`,
      key: `renders/${videoId}/${videoId}.mp4`,
      videoId: videoId
    };

    console.log(`[VideoGen] Lambda request prepared:`, {
      videoId,
      hasConfig: !!input.config,
      hasVideoUrl: !!input.videoUrl,
      duration: settings.duration
    });
    
    // DEBUG: Log the actual config being sent to Lambda
    console.log(`[VideoGen] Full input received:`, JSON.stringify(input, null, 2));
    console.log(`[VideoGen] Config being sent to Lambda:`, JSON.stringify(lambdaRequest.inputProps.config, null, 2));

    // Start Lambda render with maximum performance
    videoStatuses[videoId] = { status: 'processing', progress: 10, message: 'Starting Lambda render with 15-minute timeout...' };
    const renderResult = await simpleLambdaService.startRender(lambdaRequest);
    
    console.log(`[VideoGen] Lambda render started: ${renderResult.renderId}`);
    videoStatuses[videoId] = { status: 'processing', progress: 15, message: 'Lambda render started, monitoring progress...' };

    // Poll for completion with proper timeout handling
    let completed = false;
    let finalResult = null;
    let timeoutReached = false;
    
    // Increased timeout since OffthreadVideo fixes resolved 87% stuck issue
    const LAMBDA_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes - videos now render to 99%
    const POLL_INTERVAL_MS = 1000; // 1 second for faster progress updates
    const startTime = Date.now();
    
    // Start progress polling with timeout awareness
    let lastProgress = 0; // Move to outer scope for access in timeout handler
    
    const pollProgress = async () => {
      let consecutiveErrors = 0;
      let stuckCount = 0;
      
      while (!completed && !timeoutReached) {
        const elapsedTime = Date.now() - startTime;
        
        // Check if we're approaching Lambda timeout
        if (elapsedTime >= LAMBDA_TIMEOUT_MS) {
          console.warn(`[VideoGen] Lambda timeout reached for ${videoId} after ${Math.round(elapsedTime/1000)}s`);
          timeoutReached = true;
          break;
        }
        
        try {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
          
          const progress = await simpleLambdaService.getRenderProgress({
            id: renderResult.renderId,
            bucketName: renderResult.bucketName
          });
          
          console.log(`[VideoGen] Lambda progress:`, progress);
          
          if (progress.type === 'done' && progress.url) {
            // Render completed successfully
            completed = true;
            finalResult = progress.url;
            
            videoStatuses[videoId] = {
              status: 'completed',
              progress: 100,
              message: 'Video generation completed successfully!',
              outputPath: progress.url,
              videoUrl: progress.url,
              sizeInBytes: progress.size || 0,
              duration: Math.round(elapsedTime / 1000)
            };
            
            // ✅ FIXED: Emit completion status via WebSocket to frontend
            const io = (global as any).io;
            if (io && socketId) {
              const completionData = {
                videoId,
                progress: 100,
                phase: 'completed',
                message: 'Video generation completed successfully!',
                videoUrl: progress.url,
                sizeInBytes: progress.size || 0,
                duration: Math.round(elapsedTime / 1000),
                timestamp: new Date().toISOString()
              };
              console.log(`[VideoGen] Emitting completion to socket ${socketId}:`, completionData);
              io.to(socketId).emit('videoProgress', completionData);
            }
            
            console.log(`[VideoGen] Lambda render completed: ${progress.url} in ${Math.round(elapsedTime/1000)}s`);
            break;
          } else if (progress.type === 'progress') {
            const progressPercentage = Math.round(progress.progress || 0);
            
            // Detect stuck progress
            if (progressPercentage === lastProgress) {
              stuckCount++;
              if (stuckCount > 30) { // 60+ seconds at same progress
                console.warn(`[VideoGen] Progress stuck at ${progressPercentage}% for ${videoId}`);
                timeoutReached = true;
                break;
              }
            } else {
              stuckCount = 0;
              lastProgress = progressPercentage;
            }
            
            videoStatuses[videoId] = {
              status: 'processing',
              progress: progressPercentage,
              message: `Rendering video on Lambda... ${progressPercentage}% complete (${Math.round(elapsedTime/1000)}s elapsed)`
            };
            
            // ✅ FIXED: Emit real-time progress via WebSocket to frontend
            const io = (global as any).io;
            if (io && socketId) {
              const progressData = {
                videoId,
                progress: progressPercentage,
                phase: 'rendering',
                message: `Rendering video on Lambda... ${progressPercentage}% complete`,
                elapsedTime: Math.round(elapsedTime/1000),
                timestamp: new Date().toISOString()
              };
              console.log(`[VideoGen] Emitting progress to socket ${socketId}:`, progressData);
              io.to(socketId).emit('videoProgress', progressData);
            } else {
              console.log(`[VideoGen] No WebSocket emission - io: ${!!io}, socketId: ${socketId}`);
            }
            
            console.log(`[VideoGen] Progress update: ${progressPercentage}% (${Math.round(elapsedTime/1000)}s)`);
            consecutiveErrors = 0; // Reset error count on successful progress
          }
        } catch (error) {
          consecutiveErrors++;
          console.error(`[VideoGen] Progress polling error (${consecutiveErrors}):`, error);
          
          // Stop after too many consecutive errors
          if (consecutiveErrors >= 5) {
            console.error(`[VideoGen] Too many polling errors for ${videoId}, stopping`);
            timeoutReached = true;
            break;
          }
          
          // Exponential backoff on errors
          await new Promise(resolve => setTimeout(resolve, Math.min(5000 * consecutiveErrors, 30000)));
        }
      }
    };
    
    // Start polling and wait for completion or timeout
    await pollProgress();
    
    const result = finalResult;

    if (result) {
      console.log(`[VideoGen] Lambda video generation completed for ${videoId}: ${result}`);
      // Success case is already handled in the polling loop above
    } else if (timeoutReached) {
      console.error(`[VideoGen] Lambda render timed out for ${videoId} - cleaning up`);
      
      // Try to cancel the render to free resources
      try {
        const { simpleLambdaService } = await import('../services/simpleLambdaService');
        await simpleLambdaService.cancelRender(renderResult.renderId, renderResult.bucketName);
        console.log(`[VideoGen] Cancelled timed out render: ${renderResult.renderId}`);
      } catch (cancelError) {
        console.warn(`[VideoGen] Failed to cancel render:`, cancelError);
      }
      
      videoStatuses[videoId] = {
        status: 'failed',
        progress: Math.round((Date.now() - startTime) >= LAMBDA_TIMEOUT_MS ? 99 : (lastProgress || 0)),
        message: `Video generation timed out after ${Math.round(LAMBDA_TIMEOUT_MS/1000/60)} minutes`,
        error: `Render timeout after ${Math.round((Date.now() - startTime)/1000)}s - render was progressing normally to 99%`
      };
      
      // ✅ FIXED: Emit timeout error via WebSocket to frontend
      const io = (global as any).io;
      if (io && socketId) {
        const errorData = {
          videoId,
          progress: Math.round((Date.now() - startTime) >= LAMBDA_TIMEOUT_MS ? 99 : (lastProgress || 0)),
          phase: 'failed',
          message: `Video generation timed out after ${Math.round(LAMBDA_TIMEOUT_MS/1000/60)} minutes`,
          error: `Render timeout after ${Math.round((Date.now() - startTime)/1000)}s - try reducing video complexity or using gradient background`,
          timestamp: new Date().toISOString()
        };
        console.log(`[VideoGen] Emitting timeout error to socket ${socketId}:`, errorData);
        io.to(socketId).emit('videoProgress', errorData);
      }
    } else {
      console.error(`[VideoGen] Lambda render failed for unknown reason: ${videoId}`);
      videoStatuses[videoId] = {
        status: 'failed',
        progress: 0,
        message: 'Video generation failed',
        error: 'Unknown error during video generation'
      };
      
      // ✅ FIXED: Emit general error via WebSocket to frontend
      const io = (global as any).io;
      if (io && socketId) {
        const errorData = {
          videoId,
          progress: 0,
          phase: 'failed',
          message: 'Video generation failed',
          error: 'Unknown error during video generation',
          timestamp: new Date().toISOString()
        };
        console.log(`[VideoGen] Emitting general error to socket ${socketId}:`, errorData);
        io.to(socketId).emit('videoProgress', errorData);
      }
    }

  } catch (error) {
    console.error(`[VideoGen] Error generating video ${videoId}:`, error);
    videoStatuses[videoId] = {
      status: 'failed',
      progress: 0,
      message: 'Video generation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    // ✅ FIXED: Emit catch error via WebSocket to frontend
    const io = (global as any).io;
    if (io && socketId) {
      const errorData = {
        videoId,
        progress: 0,
        phase: 'failed',
        message: 'Video generation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.log(`[VideoGen] Emitting catch error to socket ${socketId}:`, errorData);
      io.to(socketId).emit('videoProgress', errorData);
    }
  }
}

/**
 * @route POST /api/video/generate
 * @desc Generate a new video
 * @access Public
 */
router.post('/generate', async (req, res) => {
  const requestId = (req as any).requestId || Math.random().toString(36).substr(2, 9);
  
  try {
    const { type, input, settings, userId, socketId } = req.body;
    
    console.log(`[Video][${requestId}] Generation request:`, {
      type,
      userId,
      socketId,
      hasConfig: !!(input?.config)
    });

    // Create a video ID
    const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process video generation asynchronously with socketId
    generateVideoAsync(videoId, type, input, settings, socketId).catch(error => {
      console.error(`[Video][${requestId}] Background generation failed for ${videoId}:`, error);
    });

    const response = {
      success: true,
      videoId,
      status: 'processing',
      message: 'Video generation started'
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[Video][${requestId}] Generation error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to start video generation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/video/status/:videoId
 * @desc Check video generation status
 * @access Public
 */
router.get('/status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[Video] Status check: ${videoId}`);

    const status = videoStatuses[videoId];
    if (!status) {
      return res.json({
        success: false,
        error: 'Video not found',
        videoId
      });
    }

    res.json({
      success: true,
      videoId,
      ...status
    });
  } catch (error) {
    console.error('[Video] Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check video status'
    });
  }
});

/**
 * @route POST /api/video/cancel/:videoId
 * @desc Cancel an active video generation
 * @access Public
 */
router.post('/cancel/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[Video] Cancel request: ${videoId}`);

    const status = videoStatuses[videoId];
    if (!status) {
      return res.json({
        success: false,
        error: 'Video not found',
        videoId
      });
    }

    if (status.status !== 'processing') {
      return res.json({
        success: false,
        error: `Cannot cancel video in ${status.status} state`,
        videoId
      });
    }

    // Try to cancel the Lambda render if it's using Lambda
    let lambdaCancelResult = { success: false, message: 'Not a Lambda render' };
    
    try {
      const { productionLambdaVideoService: lambdaVideoService } = await import('../services/lambdaVideoService');
      lambdaCancelResult = await lambdaVideoService.cancelRender(videoId);
    } catch (error) {
      console.warn(`[Video] Lambda cancellation not available:`, error);
    }

    // Update status to cancelled
    videoStatuses[videoId] = {
      ...status,
      status: 'cancelled',
      progress: 0,
      message: 'Video generation cancelled by user',
      error: 'Cancelled by user'
    };

    console.log(`[Video] Successfully cancelled: ${videoId}`);

    res.json({
      success: true,
      videoId,
      message: 'Video generation cancelled',
      lambdaCancel: lambdaCancelResult
    });

  } catch (error) {
    console.error('[Video] Cancel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel video generation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/video/active
 * @desc Get all active renders
 * @access Public
 */
router.get('/active', async (req, res) => {
  try {
    let lambdaActive: string[] = [];
    
    try {
      const { productionLambdaVideoService: lambdaVideoService } = await import('../services/lambdaVideoService');
      lambdaActive = lambdaVideoService.getActiveRenders();
    } catch (error) {
      console.warn(`[Video] Lambda service not available:`, error);
    }

    const localActive = Object.keys(videoStatuses).filter(
      videoId => videoStatuses[videoId].status === 'processing'
    );

    res.json({
      success: true,
      activeRenders: {
        lambda: lambdaActive,
        local: localActive,
        total: lambdaActive.length + localActive.length
      }
    });

  } catch (error) {
    console.error('[Video] Active renders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active renders'
    });
  }
});

/**
 * @route GET /api/video/renders
 * @desc List all rendered videos
 * @access Public
 */
router.get('/renders', (req, res) => {
  try {
    const rendersDir = path.resolve(__dirname, '../../../reelspeed-video-service/renders');

    if (!fs.existsSync(rendersDir)) {
      return res.json({
        success: true,
        renders: [],
        message: 'Renders directory not found'
      });
    }

    const files = fs.readdirSync(rendersDir).filter((file: string) =>
      file.endsWith('.mp4') || file.endsWith('.mov')
    );

    res.json({
      success: true,
      renders: files.map((file: string) => ({
        filename: file,
        url: `/api/video/download/${file}`,
        created: new Date().toISOString()
      }))
    });
  } catch (error) {
    console.error('[Video] Renders list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list renders'
    });
  }
});

/**
 * @route GET /api/video/download/:filename
 * @desc Download/stream a rendered video
 * @access Public
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const rendersDir = path.resolve(__dirname, '../../../reelspeed-video-service/renders');
    const filePath = path.join(rendersDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Set appropriate headers for video streaming
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Support video streaming with range requests
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('[Video] Download error:', error);
    res.status(500).json({ error: 'Failed to serve video file' });
  }
});

export default router;