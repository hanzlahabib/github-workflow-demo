import express from 'express';
import cors from 'cors';
// import { initializeVideoServices } from './config/services'; // Temporarily disabled for testing
// import { database } from './config/database';
// import authRoutes from './routes/auth';
// import videoRoutes from './routes/video';
// import textVideoRoutes from './routes/textVideo';
// import { voiceRoutes } from './routes/voices';
// import { avatarRoutes } from './routes/avatars';
// import { initializeWebSocket } from './utils/websocket';
// import './workers/videoWorker'; // Temporarily disabled due to service dependency issues

const app = express();
const PORT = parseInt(process.env.PORT || '8001');

// Store video generation status in memory for testing
const videoStatuses: { [videoId: string]: { 
  status: string; 
  progress: number; 
  message: string; 
  outputPath?: string; 
  error?: string; 
  sizeInBytes?: number;
  duration?: number;
} } = {};

// Native video generation function using Remotion programmatic API
async function generateVideoAsync(videoId: string, type: string, input: any, settings: any) {
  try {
    console.log(`[VideoGen] Starting native video generation for ${videoId}`);
    videoStatuses[videoId] = { status: 'processing', progress: 5, message: 'Initializing video service...' };
    
    // Import the native video service
    const { videoService } = await import('./services/videoService');
    
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

async function startServer() {
  try {
    // Connect to database - temporarily disabled for testing
    // await database.connect();
    console.log('Skipping database connection for testing');

    // Initialize video services - temporarily disabled for testing
    try {
      // await initializeVideoServices();
      console.log('⚠️ Video services initialization skipped for basic testing');
    } catch (error) {
      console.warn('⚠️ Video services failed to initialize, but continuing with mock services:', error);
    }

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Simple mock voice routes for development
    app.get('/api/voices/list', (req, res) => {
      const mockVoices = [
        {
          voice_id: 'mock_voice_1',
          name: 'Sarah',
          category: 'premade',
          fine_tuning: {
            is_allowed_to_fine_tune: false,
            finetuning_state: 'not_started',
            verification_failures: [],
            verification_attempts_count: 0,
            manual_verification_requested: false
          },
          labels: {
            gender: 'female',
            age: 'middle_aged',
            accent: 'american',
            description: 'A clear, professional voice perfect for business content',
            use_case: 'narration'
          },
          description: 'Professional female narrator with clear American accent',
          available_for_tiers: ['free', 'starter', 'creator', 'pro'],
          high_quality_base_model_ids: ['eleven_multilingual_v2'],
          preview_url: 'http://localhost:9000/audio/mock_voice_1_preview.mp3',
          settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          voice_id: 'mock_voice_2',
          name: 'Mike',
          category: 'premade',
          fine_tuning: {
            is_allowed_to_fine_tune: false,
            finetuning_state: 'not_started',
            verification_failures: [],
            verification_attempts_count: 0,
            manual_verification_requested: false
          },
          labels: {
            gender: 'male',
            age: 'young',
            accent: 'american',
            description: 'Friendly, casual male voice great for conversational content',
            use_case: 'conversation'
          },
          description: 'Casual male voice with friendly tone',
          available_for_tiers: ['free', 'starter', 'creator', 'pro'],
          high_quality_base_model_ids: ['eleven_multilingual_v2'],
          preview_url: 'http://localhost:9000/audio/mock_voice_2_preview.mp3',
          settings: {
            stability: 0.6,
            similarity_boost: 0.7,
            style: 0.1,
            use_speaker_boost: true
          }
        },
        {
          voice_id: 'mock_voice_3',
          name: 'Emma',
          category: 'premade',
          fine_tuning: {
            is_allowed_to_fine_tune: false,
            finetuning_state: 'not_started',
            verification_failures: [],
            verification_attempts_count: 0,
            manual_verification_requested: false
          },
          labels: {
            gender: 'female',
            age: 'young',
            accent: 'british',
            description: 'Energetic and enthusiastic voice perfect for engaging content',
            use_case: 'entertainment'
          },
          description: 'Energetic British female voice',
          available_for_tiers: ['starter', 'creator', 'pro'],
          high_quality_base_model_ids: ['eleven_multilingual_v2', 'eleven_english_v2'],
          preview_url: 'http://localhost:9000/audio/mock_voice_3_preview.mp3',
          settings: {
            stability: 0.4,
            similarity_boost: 0.9,
            style: 0.2,
            use_speaker_boost: true
          }
        },
        {
          voice_id: 'mock_voice_4',
          name: 'Alex',
          category: 'premade',
          fine_tuning: {
            is_allowed_to_fine_tune: false,
            finetuning_state: 'not_started',
            verification_failures: [],
            verification_attempts_count: 0,
            manual_verification_requested: false
          },
          labels: {
            gender: 'male',
            age: 'middle_aged',
            accent: 'american',
            description: 'Deep, authoritative voice ideal for storytelling and documentaries',
            use_case: 'narration'
          },
          description: 'Deep male narrator voice',
          available_for_tiers: ['creator', 'pro'],
          high_quality_base_model_ids: ['eleven_multilingual_v2', 'eleven_english_v2'],
          preview_url: 'http://localhost:9000/audio/mock_voice_4_preview.mp3',
          settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        }
      ];
      
      res.json({ 
        voices: mockVoices,
        has_more: false
      });
    });

    app.post('/api/voices/preview', (req, res) => {
      try {
        const { voiceId, text } = req.body || {};
        console.log(`[Mock] Voice preview request: ${voiceId} - "${text?.substring(0, 50)}..."`);
        
        // Create a simple mock audio response
        const mockAudioContent = `Mock audio for voice ${voiceId || 'unknown'}: "${(text || 'no text')?.substring(0, 50)}..."`;
        const audioBuffer = Buffer.from(mockAudioContent);
        
        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600'
        });
        
        res.send(audioBuffer);
      } catch (error) {
        console.error('[Mock] Voice preview error:', error);
        res.status(500).json({ error: 'Failed to generate voice preview' });
      }
    });

    console.log('✅ Mock voice routes enabled');

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

    app.get('/api/video/renders', (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const rendersDir = path.resolve(__dirname, '../../reelspeed-video-service/renders');
        
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

    // Serve rendered videos statically
    app.get('/api/video/download/:filename', (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const { filename } = req.params;
        const rendersDir = path.resolve(__dirname, '../../reelspeed-video-service/renders');
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

    console.log('✅ Video generation routes enabled');

    // Basic route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'ReelSpeed Backend API',
        services: {
          voices: '/api/voices/list',
          video: '/api/video/generate',
          status: '/api/video/status/:videoId',
          renders: '/api/video/renders'
        }
      });
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    console.log('🚀 About to start server...');
    
    // Start server with error handling - bind to all interfaces for Docker
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server successfully started on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Server address:`, server.address());
    });

    server.on('error', (error: any) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    server.on('close', () => {
      console.log('❌ Server closed');
    });

    // Add a 2-second delay to see if server stays alive
    setTimeout(() => {
      console.log('🔍 Server still running after 2 seconds');
      console.log('🔍 Server listening:', server.listening);
    }, 2000);
    
    console.log('🔍 Server listen called, returning from startServer function');

    // Initialize WebSocket - temporarily disabled for testing
    // initializeWebSocket(server);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      // await database.disconnect();
      server.close();
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      // await database.disconnect();
      server.close();
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;