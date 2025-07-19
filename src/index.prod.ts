import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createElevenLabsService } from './services/elevenlabs';
import voiceRoutes from './routes/voices';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Initialize ElevenLabs service
let elevenLabsInitialized = false;

async function initializeServices() {
  try {
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your-real-api-key-here') {
      throw new Error('ELEVENLABS_API_KEY not configured. Please set your real API key in .env file');
    }

    // Initialize ElevenLabs service
    createElevenLabsService({
      apiKey: process.env.ELEVENLABS_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    });

    elevenLabsInitialized = true;
    console.log('✅ ElevenLabs service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize ElevenLabs service:', error);
    throw error;
  }
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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