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

    // Import the simplified Lambda service for maximum performance
    const { simpleLambdaService } = await import('../services/simpleLambdaService');

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

    // Start Lambda render with maximum performance
    videoStatuses[videoId] = { status: 'processing', progress: 10, message: 'Starting Lambda render with 15-minute timeout...' };
    const renderResult = await simpleLambdaService.startRender(lambdaRequest);
    
    console.log(`[VideoGen] Lambda render started: ${renderResult.renderId}`);
    videoStatuses[videoId] = { status: 'processing', progress: 15, message: 'Lambda render started, monitoring progress...' };

    // Poll for completion with manual progress monitoring for better frontend updates
    let completed = false;
    let finalResult = null;
    
    // Start progress polling in background
    const pollProgress = async () => {
      while (!completed) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
          
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
              duration: 0
            };
            
            console.log(`[VideoGen] Lambda render completed: ${progress.url}`);
            break;
          } else if (progress.type === 'progress') {
            // Update progress for frontend
            const progressPercentage = Math.round(progress.progress || 0);
            videoStatuses[videoId] = {
              status: 'processing',
              progress: progressPercentage,
              message: `Rendering video on Lambda... ${progressPercentage}% complete`
            };
            
            console.log(`[VideoGen] Progress update: ${progressPercentage}%`);
          }
        } catch (error) {
          console.error(`[VideoGen] Progress polling error:`, error);
          if (!completed) {
            // Continue polling unless we're explicitly done
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s on error
          }
        }
      }
    };
    
    // Start polling
    pollProgress();
    
    // Wait for completion with timeout (15 minutes + buffer)
    const maxWaitTime = 16 * 60 * 1000; // 16 minutes
    const startTime = Date.now();
    
    while (!completed && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const result = finalResult;

    if (result) {
      console.log(`[VideoGen] Lambda video generation completed for ${videoId}: ${result}`);
      // Success case is already handled in the polling loop above
    } else if (!completed) {
      console.error(`[VideoGen] Lambda render timed out after 16 minutes for ${videoId}`);
      videoStatuses[videoId] = {
        status: 'failed',
        progress: 0,
        message: 'Video generation failed',
        error: result.error || 'Unknown error during video generation'
      };
    }

  } catch (error) {
    console.error(`[VideoGen] Error generating video ${videoId}:`, error);
    videoStatuses[videoId] = {
      status: 'failed',
      progress: 0,
      message: 'Video generation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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