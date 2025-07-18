import express from 'express';
import cors from 'cors';
// import { database } from './config/database';
// import authRoutes from './routes/auth';
// import videoRoutes from './routes/video';
// import textVideoRoutes from './routes/textVideo';
// import { voiceRoutes } from './routes/voices';
// import { avatarRoutes } from './routes/avatars';
// import { createElevenLabsService } from './services/elevenlabs';
// import { createOpenAIService } from './services/openai';
// import { createWhisperService } from './services/whisper';
// import { createRemotionService } from './services/remotion';
// import { createS3Service } from './services/s3';
// import { initializeWebSocket } from './utils/websocket';
// import './workers/videoWorker'; // Temporarily disabled to test server startup

const app = express();
const PORT = parseInt(process.env.PORT || '3002');

async function startServer() {
  try {
    // Connect to database - temporarily disabled for testing
    // await database.connect();
    console.log('Skipping database connection for testing');

    // Initialize AI services - temporarily disabled for testing
    console.log('Skipping AI services initialization for basic server test');

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes with error handling - temporarily test without problematic routes
    try {
      // app.use('/api/auth', authRoutes);
      // app.use('/api/video', videoRoutes);
      // app.use('/api/text-video', textVideoRoutes); // Enhanced text video routes
      // app.use('/api/voices', voiceRoutes);  // Temporarily disabled - has TypeScript errors
      // app.use('/api/avatars', avatarRoutes); // Temporarily disabled - has TypeScript errors
      console.log('Routes disabled for testing');
    } catch (error) {
      console.error('Error initializing routes:', error);
      throw error;
    }

    // Basic route
    app.get('/', (req, res) => {
      res.json({ message: 'ReelSpeed Backend API' });
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    console.log('🚀 About to start server...');
    
    // Start server with error handling - explicitly bind to IPv4 localhost
    const server = app.listen(PORT, '127.0.0.1', () => {
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