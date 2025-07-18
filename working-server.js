const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'ReelSpeed Backend API' });
});

// Video generation endpoint
app.post('/api/video/generate', (req, res) => {
  const { type, input, settings } = req.body;
  
  if (!type || !input || !settings) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'MISSING_FIELDS'
    });
  }

  // Mock video generation response
  const mockVideoId = Date.now().toString();
  const mockJobId = 'job-' + mockVideoId;
  
  res.status(201).json({
    success: true,
    data: {
      message: 'Video generation started',
      id: mockJobId,
      video: {
        id: mockVideoId,
        userId: 'test-user-id',
        title: `${type} Video`,
        type: type,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString()
      },
      jobId: mockJobId
    }
  });
});

// Start server
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Working server started on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🎬 Video generation: http://localhost:${PORT}/api/video/generate`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});