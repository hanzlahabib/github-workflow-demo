// Server Initialization
// Clean, focused server setup and configuration

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Configuration
import { initializeConfig, getServerConfig, getAIConfig, getStorageConfig, getCacheConfig, getFeatureFlags, useMockServices } from './config';

// Services
import { initializeCacheService } from './services/cache';
import { createElevenLabsService } from './services/elevenlabs';
import { createS3Service } from './services/s3';
import { cacheManager } from './services/cacheManager';

// Routes
import voiceRoutes from './routes/voices';
import assetsRoutes from './routes/assets';
import videoRoutes from './routes/video';
import cacheRoutes from './routes/cache';
import adminRoutes from './routes/admin';
import lambdaRoutes from './routes/lambda';

// Middleware
import { requestLogger } from './middleware/requestLogger';

export async function createServer(): Promise<{ app: express.Application; httpServer: any; io: SocketIOServer }> {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Store io instance globally for access in routes
  (global as any).io = io;

  // WebSocket connection handling
  io.on('connection', (socket) => {
    console.log(`[WebSocket] Frontend client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Frontend client disconnected: ${socket.id}`);
    });
  });

  // Initialize centralized configuration
  let serverConfig: ReturnType<typeof getServerConfig>;
  try {
    const { config: appConfig } = initializeConfig();
    serverConfig = appConfig.server;
    console.log(`[Config] Backend initialized with centralized configuration`);
  } catch (error) {
    console.error('Failed to initialize configuration:', error);
    throw error;
  }

  // Basic middleware
  app.use(cors({
    origin: serverConfig.cors
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

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
          endpoint: storageConfig.cloudflare.endpoint,
          publicUrl: storageConfig.cloudflare.publicUrl
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

  // Initialize R2 video cache manager and proxy service
  try {
    console.log('[Server] Initializing R2 video cache system...');
    await cacheManager.initialize();
    console.log('✅ R2 video cache system initialized with proxy service');
  } catch (error) {
    console.error('❌ Failed to initialize R2 cache system:', error);
    console.warn('⚠️ Continuing without cache system - R2 videos may cause rendering timeouts');
  }

  // API Routes
  app.use('/api/voices', voiceRoutes);
  app.use('/api/assets', assetsRoutes);
  app.use('/api/video', videoRoutes);
  app.use('/api/cache', cacheRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/lambda', lambdaRoutes);

  console.log('✅ API routes initialized (including cache management)');

  // Static file serving
  app.use('/uploads/audio', express.static(path.resolve(process.cwd(), 'uploads', 'audio')));
  console.log('✅ Static audio upload routes enabled');

  // Basic routes
  app.get('/', (req, res) => {
    res.json({
      message: 'ReelSpeed Backend API',
      services: {
        voices: '/api/voices/list',
        video: '/api/video/generate',
        status: '/api/video/status/:videoId',
        renders: '/api/video/renders',
        cache: '/api/cache/status',
        lambda: {
          render: '/api/lambda/render',
          progress: '/api/lambda/progress',
          status: '/api/lambda/status',
          test: '/api/lambda/test'
        }
      }
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  return { app, httpServer, io };
}

export async function startServer(): Promise<void> {
  try {
    const { app, httpServer, io } = await createServer();
    
    // Get server config
    const { config } = initializeConfig();
    const PORT = config.server.port;

    // Start server with WebSocket support - bind to all interfaces for Docker
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server with WebSocket successfully started on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket server running`);
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
      console.log('❌ Server with WebSocket closed');
    });

    // Server health check
    setTimeout(() => {
      console.log(`[Server] Running on port ${PORT}, listening: ${server.listening}`);
    }, 2000);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      io.close();
      server.close();
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      io.close();
      server.close();
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}