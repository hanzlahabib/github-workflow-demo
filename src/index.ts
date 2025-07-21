// Node.js built-in modules
import fs from 'fs';
import path from 'path';

// External dependencies
import cors from 'cors';
import express from 'express';

// Configuration
import { initializeConfig, getServerConfig, getAIConfig, getStorageConfig, getCacheConfig, getFeatureFlags, useMockServices } from './config';

// Types
import type { VideoGenerationRequest, VideoStatusResponse } from './types/api';

// Services
import { initializeCacheService } from './services/cache';
import { createElevenLabsService } from './services/elevenlabs';
import { createS3Service } from './services/s3';

// Routes
import voiceRoutes from './routes/voices';

// Temporarily disabled imports for testing
// import { initializeVideoServices } from './config/services';
// import { database } from './config/database';
// import authRoutes from './routes/auth';
// import videoRoutes from './routes/video';
// import textVideoRoutes from './routes/textVideo';
// import { avatarRoutes } from './routes/avatars';
// import { initializeWebSocket } from './utils/websocket';
// import './workers/videoWorker';

const app = express();

// Initialize centralized configuration
let serverConfig: ReturnType<typeof getServerConfig>;
try {
  const { env, config: appConfig } = initializeConfig();
  console.log('🔍 App config:', appConfig, env);
  serverConfig = appConfig.server;
  console.log(`[Config] Backend initialized with centralized configuration`);
} catch (error) {
  console.error('Failed to initialize configuration:', error);
  process.exit(1);
}

const PORT = serverConfig.port;

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
    app.use(cors({
      origin: serverConfig.cors
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize AI services with centralized config
    try {
      const aiConfig = getAIConfig();
      const storageConfig = getStorageConfig();

      if (!useMockServices()) {
        // Initialize ElevenLabs service
        createElevenLabsService(aiConfig.elevenlabs);
        console.log('✅ ElevenLabs service initialized with centralized config');
      }

      // Initialize S3 service (supports both AWS S3 and Cloudflare R2)
      if (!useMockServices()) {
        if (storageConfig.provider === 'cloudflare' && storageConfig.cloudflare) {
          createS3Service({
            accessKeyId: storageConfig.cloudflare.accessKey,
            secretAccessKey: storageConfig.cloudflare.secretKey,
            region: 'auto', // Cloudflare R2 uses 'auto'
            bucketName: storageConfig.cloudflare.bucket,
            endpoint: storageConfig.cloudflare.endpoint
          });
          console.log('✅ S3 service initialized with Cloudflare R2 config');
        } else if (storageConfig.provider === 'aws' && storageConfig.aws) {
          createS3Service({
            accessKeyId: storageConfig.aws.accessKeyId,
            secretAccessKey: storageConfig.aws.secretAccessKey,
            region: storageConfig.aws.region,
            bucketName: storageConfig.aws.bucket,
            endpoint: undefined // AWS S3 doesn't need custom endpoint
          });
          console.log('✅ S3 service initialized with AWS S3 config');
        } else {
          console.log('⚠️ S3 service not initialized - no valid storage provider configuration found');
        }
      } else {
        console.log('⚠️ S3 service not initialized - using mock services');
      }

      // Initialize cache service if caching is enabled
      const { enableCaching } = getFeatureFlags();
      if (enableCaching) {
        const cacheConfig = getCacheConfig();
        initializeCacheService({
          redis: cacheConfig.redis,
          defaultTTL: cacheConfig.defaultTTL,
          memoryFallback: cacheConfig.memoryFallback,
        });
        console.log('✅ Cache service initialized');
      } else {
        console.log('⚠️ Cache service disabled via ENABLE_CACHING=false');
      }

      console.log(`✅ Mock services: ${useMockServices() ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ Failed to initialize AI services:', error);
    }

    // Real voice routes using ElevenLabs
    app.use('/api/voices', voiceRoutes);

    console.log('✅ Real voice routes enabled');

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

    // Serve uploaded audio files statically (fallback when S3 is not available)
    app.use('/uploads/audio', express.static(path.resolve(process.cwd(), 'uploads', 'audio')));
    console.log('✅ Static audio upload routes enabled');

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
