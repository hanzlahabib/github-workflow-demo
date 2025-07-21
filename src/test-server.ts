import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3030');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.CORS_ORIGIN].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Simple auth middleware for testing
const testAuth = (req: any, res: any, next: any) => {
  req.user = { id: 'test_user_123', email: 'test@example.com' };
  next();
};

// Initialize ElevenLabs client
const elevenLabsClient: any = null;

async function initElevenLabs() {
  try {
    console.log('🔍 ELEVENLABS_API_KEY check:', process.env.ELEVENLABS_API_KEY ? `${process.env.ELEVENLABS_API_KEY.substring(0, 10)}...` : 'NOT SET');

    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your-real-api-key-here') {
      console.log('⚠️ Using mock ElevenLabs API - set ELEVENLABS_API_KEY for real testing');
      return null;
    }

    console.log('📦 Loading ElevenLabs service...');
    const { createElevenLabsService } = await import('./services/elevenlabs');

    console.log('🔧 Creating ElevenLabs service...');
    const service = createElevenLabsService({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    console.log('🧪 Testing ElevenLabs connection...');
    const testConnection = await service.testConnection();
    if (!testConnection) {
      throw new Error('Connection test failed');
    }

    console.log('✅ ElevenLabs service initialized successfully');
    return service;
  } catch (error) {
    console.error('❌ ElevenLabs initialization failed:', error);
    return null;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    elevenlabs: !!elevenLabsClient,
    timestamp: new Date().toISOString()
  });
});

// Voice endpoints
app.get('/api/voices/list', testAuth, async (req, res) => {
  try {
    if (!elevenLabsClient) {
      return res.status(500).json({ error: 'ElevenLabs service not available' });
    }

    const voicesResponse = await elevenLabsClient.getVoices();
    console.log(`[DEBUG] ElevenLabs returned ${voicesResponse.voices.length} voices`);

    // Return ElevenLabs data as-is for better performance
    res.json({
      voices: voicesResponse.voices,
      total: voicesResponse.voices.length,
      hasMore: voicesResponse.has_more
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

app.post('/api/voices/preview', testAuth, async (req, res) => {
  try {
    const { voiceId, text = "Hello! This is a preview of this voice." } = req.body;

    if (!voiceId) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    if (!elevenLabsClient) {
      // Return mock audio
      const mockAudio = Buffer.from(`Mock audio for voice ${voiceId}: "${text}"`);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': mockAudio.length.toString()
      });
      return res.send(mockAudio);
    }

    // Limit preview text length
    const previewText = text.substring(0, 100);

    const audioResponse = await elevenLabsClient.generateSpeech({
      voice_id: voiceId,
      text: previewText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: elevenLabsClient.getOptimalVoiceSettings('en'),
    });

    res.set({
      'Content-Type': audioResponse.content_type,
      'Content-Length': audioResponse.audio_data.length,
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `inline; filename="${audioResponse.filename}"`,
    });

    res.send(audioResponse.audio_data);
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

app.post('/api/voices/generate-message', testAuth, async (req, res) => {
  try {
    const { messageId, text, voiceId, language = 'en' } = req.body;

    if (!messageId || !text || !voiceId) {
      return res.status(400).json({
        error: 'Message ID, text, and voice ID are required'
      });
    }

    if (!elevenLabsClient) {
      // Mock response
      return res.json({
        success: true,
        messageId,
        audioUrl: `http://localhost:${PORT}/mock-audio/${messageId}.mp3`,
        audioKey: `messages/test_user/${messageId}.mp3`,
        voiceId,
        filename: `message_${messageId}.mp3`,
        duration: 5000
      });
    }

    console.log(`Generating speech for message ${messageId} with voice ${voiceId}`);

    const audioGenerator = await elevenLabsClient.textToSpeech.convert(voiceId, {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      },
      output_format: 'mp3_44100_128'
    });

    // Convert to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioGenerator) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // In production, you'd upload to S3 here
    const audioUrl = `http://localhost:${PORT}/generated-audio/${messageId}.mp3`;

    res.json({
      success: true,
      messageId,
      audioUrl,
      audioKey: `messages/${(req as any).user.id}/${messageId}.mp3`,
      voiceId,
      filename: `message_${messageId}.mp3`,
      duration: Math.round(text.length * 50) // Rough estimate
    });

  } catch (error: any) {
    console.error('Error generating message speech:', error);
    res.status(500).json({ error: 'Failed to generate message speech' });
  }
});

// Test connection endpoint
app.get('/api/voices/test/connection', testAuth, async (req, res) => {
  try {
    if (!elevenLabsClient) {
      return res.json({ connected: false, mock: true });
    }

    await elevenLabsClient.voices.getAll();
    res.json({ connected: true, mock: false });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.json({ connected: false, error: error.message });
  }
});

// Error handling
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
async function startServer() {
  try {
    await initElevenLabs();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Test server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🎤 Voice list: http://localhost:${PORT}/api/voices/list`);
      console.log(`📝 Set ELEVENLABS_API_KEY in .env for real API testing`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}
