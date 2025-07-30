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

// Native video generation function using Remotion programmatic API
async function generateVideoAsync(videoId: string, type: string, input: any, settings: any, socketId?: string) {
  try {
    console.log(`[VideoGen] Starting native video generation for ${videoId}`);
    videoStatuses[videoId] = { status: 'processing', progress: 5, message: 'Initializing video service...' };

    // Import the native video service
    const { videoService } = await import('../services/videoService');

    // Prepare the request - PRESERVE ORIGINAL INPUT INCLUDING CONFIG
    const request = {
      type: type as 'story' | 'reddit' | 'quiz' | 'educational',
      input: {
        text: input.text || input.script || 'Default video content',
        script: input.script,
        title: input.title,
        config: input.config // ✅ CRITICAL: Preserve enhanced config from frontend
      },
      settings: {
        duration: settings.duration || 30,
        width: settings.width || 1080,
        height: settings.height || 1920,
        fps: settings.fps || 30,
        voice: settings.voice || 'default',
        background: settings.background || '#000000',
        language: settings.language || 'en'
      },
      userId: 'video_generation_user'
    };

    console.log(`[VideoGen] Request prepared:`, {
      type: request.type,
      textLength: request.input.text?.length,
      actualText: request.input.text,
      duration: request.settings.duration
    });

    // Generate video with progress callback
    const result = await videoService.generateVideo(request, (progress) => {
      console.log(`[VideoGen] Progress update:`, progress);

      // Update status based on progress  
      videoStatuses[videoId] = {
        status: 'processing',
        progress: progress.progress,
        message: progress.message
      };
    }, socketId);

    if (result.success && result.outputPath) {
      console.log(`[VideoGen] Video generation completed for ${videoId}`);

      // For remote video service, preserve the full videoUrl
      // For local video service, create download path
      let finalOutputPath = result.outputPath;
      
      if (result.videoUrl) {
        // Remote video service provided full URL, use it directly
        finalOutputPath = result.videoUrl;
        console.log(`[VideoGen] Using remote video URL: ${finalOutputPath}`);
      } else if (!result.outputPath.startsWith('http')) {
        // Local video service, create download path
        const fileName = path.basename(result.outputPath);
        finalOutputPath = `/api/video/download/${fileName}`;
        console.log(`[VideoGen] Created local download path: ${finalOutputPath}`);
      }

      videoStatuses[videoId] = {
        status: 'completed',
        progress: 100,
        message: 'Video generation completed successfully!',
        outputPath: finalOutputPath,
        videoUrl: finalOutputPath, // Include videoUrl for frontend
        sizeInBytes: result.sizeInBytes,
        duration: result.durationInSeconds
      };
    } else {
      console.error(`[VideoGen] Video generation failed for ${videoId}:`, result.error);
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