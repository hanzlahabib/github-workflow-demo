const express = require('express');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.VOICE_TEST_PORT || '8003');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Simple auth middleware for testing
const testAuth = (req, res, next) => {
  req.user = { id: 'test_user_123', email: 'test@example.com' };
  next();
};

// Voice cache to avoid repeated API calls
const voiceCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

const isCacheValid = () => {
  return voiceCache.data && voiceCache.timestamp && 
         (Date.now() - voiceCache.timestamp) < voiceCache.ttl;
};

// Initialize ElevenLabs client
let elevenLabsClient = null;

// Initialize Cloudflare R2 client
let r2Client = null;

async function initR2() {
  try {
    if (!process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID === 'dummy-r2-key') {
      console.log('⚠️ Using local file storage - set R2 credentials for cloud storage');
      console.log('📝 To set up R2: https://developers.cloudflare.com/r2/get-started/');
      r2Client = null;
      return null;
    }

    r2Client = new S3Client({
      region: 'auto', // R2 uses 'auto' region
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    
    console.log('✅ Cloudflare R2 client initialized');
    return r2Client;
  } catch (error) {
    console.error('❌ R2 initialization failed:', error);
    r2Client = null;
    return null;
  }
}

// Upload audio file to Cloudflare R2
async function uploadToR2(audioBuffer, filename, ownerId, voiceId) {
  try {
    if (!r2Client) {
      throw new Error('R2 client not initialized');
    }
    
    const key = `audio/${ownerId}/${voiceId}/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
      Metadata: {
        'owner-id': ownerId,
        'voice-id': voiceId,
        'generated-at': new Date().toISOString()
      }
    });
    
    await r2Client.send(command);
    
    // Return public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`✅ Audio uploaded to R2: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Failed to upload to R2:', error);
    throw error;
  }
}

async function initElevenLabs() {
  try {
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your-real-api-key-here') {
      console.log('⚠️ Using mock ElevenLabs API - set ELEVENLABS_API_KEY for real testing');
      console.log('📝 To get your API key: https://elevenlabs.io/app/settings/api-keys');
      elevenLabsClient = null;
      return null;
    }

    const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    // Test the connection by fetching voices
    await client.voices.getAll();
    
    elevenLabsClient = client;
    console.log('✅ ElevenLabs client initialized with real API and tested');
    return elevenLabsClient;
  } catch (error) {
    console.error('❌ ElevenLabs initialization failed:', error);
    elevenLabsClient = null;
    return null;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    elevenlabs: !!elevenLabsClient,
    mock: !elevenLabsClient,
    apiKey: process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  });
});

// Voice endpoints
app.get('/api/voices/list', testAuth, async (req, res) => {
  try {
    // Check cache first
    if (isCacheValid()) {
      console.log('📦 Returning cached voice data...');
      return res.json(voiceCache.data);
    }

    if (!elevenLabsClient) {
      // Return mock voices
      const mockData = {
        voices: [
          {
            voice_id: 'pNInz6obpgDQGcFmaJgB',
            name: 'Adam',
            gender: 'male',
            age: 'middle_aged',
            accent: 'american',
            description: 'Deep voice',
            available_for_tiers: ['free', 'starter', 'creator', 'pro']
          },
          {
            voice_id: 'EXAVITQu4vr4xnSDxMaL',
            name: 'Sarah',
            gender: 'female',
            age: 'young',
            accent: 'american',
            description: 'Clear voice',
            available_for_tiers: ['free', 'starter', 'creator', 'pro']
          },
          {
            voice_id: '21m00Tcm4TlvDq8ikWAM',
            name: 'Rachel',
            gender: 'female',
            age: 'young',
            accent: 'american',
            description: 'Calm voice',
            available_for_tiers: ['free', 'starter', 'creator', 'pro']
          }
        ],
        total: 3,
        hasMore: false
      };
      
      // Cache mock data too
      voiceCache.data = mockData;
      voiceCache.timestamp = Date.now();
      return res.json(mockData);
    }

    console.log('🎤 Fetching voices from ElevenLabs API...');
    
    // For now, just get all available voices through the standard method
    // Note: Library voices may require different API endpoints or premium access
    const response = await elevenLabsClient.voices.getAll();
    
    console.log(`📊 Found ${response.voices.length} voices`);
    console.log('Raw voice sample:', JSON.stringify(response.voices[0], null, 2));
    
    // Note: If you need more voices, you may need:
    // 1. Premium ElevenLabs subscription for access to more library voices
    // 2. Different API endpoints for public voice library
    // 3. Direct REST API calls to ElevenLabs instead of SDK
    console.log('ℹ️ Currently showing account-accessible voices only');
    
    // Log preview URL availability
    const voicesWithPreview = response.voices.filter(v => v.previewUrl || v.preview_url).length;
    console.log(`🎵 ${voicesWithPreview}/${response.voices.length} voices have preview URLs`);
    
    const voices = response.voices.map(voice => ({
      voice_id: voice.voiceId,
      name: voice.name,
      category: voice.category || 'premade',
      labels: {
        gender: voice.labels?.gender || 'unknown',
        age: voice.labels?.age || 'unknown', 
        accent: voice.labels?.accent || 'neutral',
        description: voice.description || '',
        use_case: voice.labels?.use_case || 'general'
      },
      description: voice.description || '',
      preview_url: voice.previewUrl || voice.preview_url, // Handle both naming conventions
      available_for_tiers: voice.available_for_tiers || [],
      settings: voice.settings || {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      },
      high_quality_base_model_ids: voice.high_quality_base_model_ids || [],
      fine_tuning: {
        is_allowed_to_fine_tune: false,
        finetuning_state: 'not_started',
        verification_failures: [],
        verification_attempts_count: 0,
        manual_verification_requested: false
      }
    }));

    console.log(`✅ Retrieved ${voices.length} voices from ElevenLabs`);
    
    const responseData = {
      voices,
      total: voices.length,
      hasMore: false
    };
    
    // Cache the response
    voiceCache.data = responseData;
    voiceCache.timestamp = Date.now();
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// Clear voice cache (for testing)
app.delete('/api/voices/cache', testAuth, (req, res) => {
  voiceCache.data = null;
  voiceCache.timestamp = null;
  console.log('🗑️ Voice cache cleared');
  res.json({ message: 'Voice cache cleared' });
});

app.post('/api/voices/preview', testAuth, async (req, res) => {
  try {
    const { voiceId, text } = req.body;
    
    if (!elevenLabsClient) {
      // Return mock audio
      const mockAudio = Buffer.from(`Mock audio for voice ${voiceId}: "${text}"`);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': mockAudio.length.toString()
      });
      return res.send(mockAudio);
    }

    console.log(`🎵 Generating real preview for voice ${voiceId}: "${text?.substring(0, 50)}..."`);

    // Try the direct approach with the ElevenLabs SDK
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text || "Hello! This is a voice preview.",
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    console.log(`✅ Generated audio preview (${audioBuffer.length} bytes)`);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600'
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('❌ Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Clippie-style voice generation endpoint
app.post('/api/voices/generate-voiceover-audio', testAuth, async (req, res) => {
  try {
    const { script, selectedVoiceId, stability = 50, similarity = 75, ownerId } = req.body;
    
    console.log(`🎵 Generating voiceover audio for user ${ownerId} with voice ${selectedVoiceId}`);
    console.log(`📝 Script: "${script?.substring(0, 100)}..."`);
    
    if (!script || !selectedVoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Script and selectedVoiceId are required'
      });
    }
    
    if (!elevenLabsClient) {
      // Mock response for testing
      const mockResponse = {
        success: true,
        response: {
          audio_url: `https://mock-cdn.example.com/audio/${selectedVoiceId}-${Date.now()}.mp3`,
          duration: Math.random() * 3 + 1 // Random duration between 1-4 seconds
        }
      };
      console.log('📦 Returning mock audio response');
      return res.json(mockResponse);
    }
    
    // Generate audio using ElevenLabs API
    const startTime = Date.now();
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: stability / 100, // Convert percentage to decimal
          similarity_boost: similarity / 100,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }
    
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const generationTime = Date.now() - startTime;
    
    console.log(`✅ Generated audio (${audioBuffer.length} bytes) in ${generationTime}ms`);
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${selectedVoiceId.substring(0, 8)}.mp3`;
    
    let audioUrl;
    
    // Try to upload to Cloudflare R2, fallback to local storage
    if (r2Client) {
      try {
        audioUrl = await uploadToR2(audioBuffer, filename, ownerId, selectedVoiceId);
        console.log('🌐 Audio uploaded to Cloudflare R2');
      } catch (r2Error) {
        console.error('❌ R2 upload failed, falling back to local storage:', r2Error);
        // Fallback to local storage
        if (!global.audioCache) {
          global.audioCache = new Map();
        }
        global.audioCache.set(filename, audioBuffer);
        audioUrl = `${req.protocol}://${req.get('host')}/api/audio/${filename}`;
      }
    } else {
      // Store in memory temporarily (fallback when R2 not configured)
      if (!global.audioCache) {
        global.audioCache = new Map();
      }
      global.audioCache.set(filename, audioBuffer);
      audioUrl = `${req.protocol}://${req.get('host')}/api/audio/${filename}`;
      console.log('💾 Audio stored locally (R2 not configured)');
    }
    
    // Calculate duration estimate (rough approximation)
    const wordsPerMinute = 150;
    const wordCount = script.split(' ').length;
    const estimatedDuration = Math.max(0.5, (wordCount / wordsPerMinute) * 60);
    
    const responseData = {
      success: true,
      response: {
        audio_url: audioUrl,
        duration: Math.round(estimatedDuration * 10) / 10 // Round to 1 decimal place
      }
    };
    
    console.log(`🎯 Returning audio URL: ${responseData.response.audio_url}`);
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error generating voiceover audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate voiceover audio',
      details: error.message
    });
  }
});

// Temporary audio serving endpoint (until R2 is implemented)
app.get('/api/audio/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!global.audioCache || !global.audioCache.has(filename)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    const audioBuffer = global.audioCache.get(filename);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600'
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('❌ Error serving audio file:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// Start server
async function startServer() {
  try {
    await initElevenLabs();
    await initR2();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ElevenLabs Test Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🎤 Voice list: http://localhost:${PORT}/api/voices/list`);
      console.log(`🎵 Voiceover audio: http://localhost:${PORT}/api/voices/generate-voiceover-audio`);
      console.log(`📝 Set ELEVENLABS_API_KEY in .env for real API testing`);
      console.log(`🌐 Set R2 credentials in .env for cloud storage`);
      console.log(`🌐 Test with frontend at: http://localhost:5176`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();