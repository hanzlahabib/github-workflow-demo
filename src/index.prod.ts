import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createElevenLabsService } from './services/elevenlabs';
import { initializeConfig, getAIConfig } from './config';
import voiceRoutes from './routes/voices';

// Load environment variables
dotenv.config();

const app = express();

// Initialize centralized configuration
let serverConfig: any;
let aiConfig: any;
try {
  const { env, config } = initializeConfig();
  serverConfig = config.server;
  aiConfig = config.ai;
  console.log('Configuration initialized successfully');
} catch (error) {
  console.error('Failed to initialize configuration:', error);
  process.exit(1);
}

const PORT = serverConfig.port;

// Initialize ElevenLabs service
let elevenLabsInitialized = false;

async function initializeServices() {
  try {
    // Initialize ElevenLabs service using centralized config
    createElevenLabsService(aiConfig.elevenlabs);

    elevenLabsInitialized = true;
    console.log('✅ ElevenLabs service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize ElevenLabs service:', error);
    throw error;
  }
}

// Middleware
app.use(cors({
  origin: serverConfig.cors,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      elevenlabs: elevenLabsInitialized
    }
  });
});

// API Routes
app.use('/api/voices', voiceRoutes);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    await initializeServices();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Production server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🎤 Voice API: http://localhost:${PORT}/api/voices/list`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n🔄 Shutting down server gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app };
