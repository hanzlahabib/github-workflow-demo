#!/usr/bin/env node

// Test script for native video service
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8002;

// Store video generation status in memory for testing
const videoStatuses = {};

// Native video generation function using Remotion programmatic API
async function generateVideoAsync(videoId, type, input, settings) {
  try {
    console.log(`[VideoGen] Starting native video generation for ${videoId}`);
    videoStatuses[videoId] = { status: 'processing', progress: 5, message: 'Initializing video service...' };
    
    // Import the native video service
    const { videoService } = require('./dist/services/videoService');
    
    // Prepare the request - PRESERVE ORIGINAL INPUT INCLUDING CONFIG
    const request = {
      type: type,
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
    });

    if (result.success && result.outputPath) {
      console.log(`[VideoGen] Video generation completed for ${videoId}`);
      
      // Get the filename from the full path
      const path = require('path');
      const fileName = path.basename(result.outputPath);
      
      videoStatuses[videoId] = {
        status: 'completed',
        progress: 100,
        message: 'Video generation completed successfully!',
        outputPath: `/api/video/download/${fileName}`,
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

async function startTestServer() {
  // Middleware
  app.use(cors());
  app.use(express.json());

  // Video generation routes
  app.post('/api/video/generate', async (req, res) => {
    try {
      const { type, input, settings, userId } = req.body;
      console.log(`[Video] Generation request: ${type}`, { input, settings });
      
      // Create a video ID
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Start video generation in background
      console.log(`[Video] Starting video generation for ${videoId}`);
      
      // Process video generation asynchronously
      generateVideoAsync(videoId, type, input, settings).catch(error => {
        console.error(`[Video] Background generation failed for ${videoId}:`, error);
      });
      
      res.json({
        success: true,
        videoId,
        status: 'processing',
        message: 'Video generation started'
      });
    } catch (error) {
      console.error('[Video] Generation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to start video generation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/video/status/:videoId', async (req, res) => {
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

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  console.log('🚀 Starting test server...');
  
  // Start server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Test server started on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });

  console.log('✅ Test server ready for video generation testing');
}

startTestServer().catch(error => {
  console.error('Failed to start test server:', error);
  process.exit(1);
});