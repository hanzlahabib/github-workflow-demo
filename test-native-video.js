// Direct test of native video service
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8002;

app.use(cors());
app.use(express.json());

// Test video generation with simplified mock
app.post('/api/video/generate', async (req, res) => {
  try {
    console.log('📹 Received video generation request:', req.body);
    
    const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Test the video service path resolution
    const videoServicePath = path.resolve(__dirname, '../reelspeed-video-service');
    const rendersDir = path.join(videoServicePath, 'renders');
    
    console.log('🎬 Video service paths:');
    console.log('  - Video service:', videoServicePath);
    console.log('  - Renders dir:', rendersDir);
    
    // Check if paths exist
    const fs = require('fs');
    const videoServiceExists = fs.existsSync(videoServicePath);
    const rendersDirExists = fs.existsSync(rendersDir);
    
    console.log('🔍 Path verification:');
    console.log('  - Video service exists:', videoServiceExists);
    console.log('  - Renders dir exists:', rendersDirExists);
    
    if (videoServiceExists) {
      // Check for key files
      const entryPoint = path.join(videoServicePath, 'src/index.ts');
      const compositionsDir = path.join(videoServicePath, 'src/compositions');
      
      console.log('🔍 Key files check:');
      console.log('  - Entry point exists:', fs.existsSync(entryPoint));
      console.log('  - Compositions dir exists:', fs.existsSync(compositionsDir));
      
      if (fs.existsSync(compositionsDir)) {
        const compositions = fs.readdirSync(compositionsDir);
        console.log('  - Compositions found:', compositions.filter(f => f.endsWith('.tsx')));
      }
    }
    
    res.json({
      success: true,
      videoId,
      status: 'initialized',
      message: 'Native video service paths verified',
      debug: {
        videoServicePath,
        rendersDir,
        videoServiceExists,
        rendersDirExists
      }
    });
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'native-video-test' });
});

app.listen(PORT, () => {
  console.log('🚀 Native video test server running on port', PORT);
  console.log('🔗 Test endpoint: POST http://localhost:' + PORT + '/api/video/generate');
});