import express from 'express';
import { simpleAuth, SimpleSimpleAuthRequest } from '../middleware/simpleAuth';
import { getElevenLabsService } from '../services/elevenlabs';

const router = express.Router();

// Get all available voices
router.get('/list', simpleAuth, async (req: SimpleSimpleAuthRequest, res) => {
  try {
    const elevenLabsService = getElevenLabsService();
    const voicesResponse = await elevenLabsService.getVoices();
    
    // Enhance voices with additional metadata
    const enhancedVoices = voicesResponse.voices.map(voice => ({
      ...voice,
      gender: voice.labels?.gender || 'unknown',
      age: voice.labels?.age || 'unknown',
      accent: voice.labels?.accent || 'neutral',
      use_case: voice.labels?.use_case || 'general',
      language: voice.labels?.language || 'en',
      rating: voice.labels?.rating ? parseFloat(voice.labels.rating) : null,
    }));

    res.json({ 
      voices: enhancedVoices,
      total: enhancedVoices.length,
      hasMore: voicesResponse.has_more 
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// Get a specific voice by ID
router.get('/:voiceId', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { voiceId } = req.params;
    const elevenLabsService = getElevenLabsService();
    const voice = await elevenLabsService.getVoice(voiceId);
    
    const enhancedVoice = {
      ...voice,
      gender: voice.labels?.gender || 'unknown',
      age: voice.labels?.age || 'unknown',
      accent: voice.labels?.accent || 'neutral',
      use_case: voice.labels?.use_case || 'general',
      language: voice.labels?.language || 'en',
      rating: voice.labels?.rating ? parseFloat(voice.labels.rating) : null,
    };

    res.json(enhancedVoice);
  } catch (error) {
    console.error('Error fetching voice:', error);
    res.status(500).json({ error: 'Failed to fetch voice' });
  }
});

// Generate voice preview
router.post('/preview', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { voiceId, text = "Hello! This is a preview of this voice." } = req.body;

    if (!voiceId) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    // Limit preview text length
    const previewText = text.substring(0, 100);
    
    const elevenLabsService = getElevenLabsService();
    const audioResponse = await elevenLabsService.generateSpeech({
      voice_id: voiceId,
      text: previewText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: elevenLabsService.getOptimalVoiceSettings('en'),
    });

    res.set({
      'Content-Type': audioResponse.content_type,
      'Content-Length': audioResponse.audio_data.length,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Disposition': `inline; filename="${audioResponse.filename}"`,
    });
    
    res.send(audioResponse.audio_data);
  } catch (error) {
    console.error('Error generating voice preview:', error);
    res.status(500).json({ error: 'Failed to generate voice preview' });
  }
});

// Generate speech for a single message
router.post('/generate-message', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { 
      messageId, 
      text, 
      voiceId, 
      language = 'en',
      speed = 'normal',
      customSettings 
    } = req.body;

    if (!messageId || !text || !voiceId) {
      return res.status(400).json({ 
        error: 'Message ID, text, and voice ID are required' 
      });
    }

    const elevenLabsService = getElevenLabsService();
    
    // Use custom settings or optimal settings for language
    const voiceSettings = customSettings || elevenLabsService.getOptimalVoiceSettings(language, speed);
    
    const audioResponse = await elevenLabsService.generateMessageSpeech(text, voiceId, messageId);

    // Store the generated audio file (integrate with your S3 service)
    const audioKey = `messages/${req.user.id}/${messageId}_${Date.now()}.mp3`;
    const audioUrl = await elevenLabsService.uploadToS3(audioResponse.audio_data, audioKey);

    res.json({
      success: true,
      messageId,
      audioUrl,
      audioKey,
      voiceId,
      filename: audioResponse.filename,
      duration: audioResponse.duration_ms,
      settings: voiceSettings,
    });

  } catch (error) {
    console.error('Error generating message speech:', error);
    res.status(500).json({ error: 'Failed to generate message speech' });
  }
});

// Generate speech for multiple messages (batch)
router.post('/generate-batch', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { messages, language = 'en', speed = 'normal' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Messages array is required' 
      });
    }

    // Validate message format
    for (const message of messages) {
      if (!message.id || !message.text || !message.voiceId) {
        return res.status(400).json({ 
          error: 'Each message must have id, text, and voiceId' 
        });
      }
    }

    const elevenLabsService = getElevenLabsService();
    const results = await elevenLabsService.generateBatchSpeech(messages);

    // Upload all generated audio files
    const uploadPromises = results.map(async (result) => {
      const audioKey = `messages/${req.user.id}/${result.messageId}_${Date.now()}.mp3`;
      const audioUrl = await elevenLabsService.uploadToS3(result.audioResponse.audio_data, audioKey);
      
      return {
        messageId: result.messageId,
        audioUrl,
        audioKey,
        filename: result.audioResponse.filename,
        duration: result.audioResponse.duration_ms,
      };
    });

    const uploadedResults = await Promise.all(uploadPromises);

    res.json({
      success: true,
      totalMessages: messages.length,
      generatedCount: results.length,
      results: uploadedResults,
    });

  } catch (error) {
    console.error('Error generating batch speech:', error);
    res.status(500).json({ error: 'Failed to generate batch speech' });
  }
});

// Generate full voice for text story (legacy endpoint for backward compatibility)
router.post('/generate', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { 
      voiceId, 
      text, 
      personId, 
      language = 'en',
      speed = 'normal',
      stability, 
      similarity, 
      style 
    } = req.body;

    if (!voiceId || !text || !personId) {
      return res.status(400).json({ error: 'Voice ID, text, and person ID are required' });
    }

    const elevenLabsService = getElevenLabsService();
    
    // Use provided settings or optimal settings
    let voiceSettings;
    if (stability !== undefined || similarity !== undefined || style !== undefined) {
      voiceSettings = {
        stability: stability || 0.5,
        similarity_boost: similarity || 0.8,
        style: style || 0.0,
        use_speaker_boost: true,
      };
    } else {
      voiceSettings = elevenLabsService.getOptimalVoiceSettings(language, speed);
    }

    const audioResponse = await elevenLabsService.generateSpeech({
      voice_id: voiceId,
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
    });

    // Store the generated audio file
    const audioKey = `voices/${req.user.id}/${personId}_${Date.now()}.mp3`;
    const audioUrl = await elevenLabsService.uploadToS3(audioResponse.audio_data, audioKey);

    res.json({
      success: true,
      audioUrl,
      audioKey,
      voiceId,
      personId,
      filename: audioResponse.filename,
      duration: audioResponse.duration_ms,
      settings: voiceSettings,
    });

  } catch (error) {
    console.error('Error generating voice:', error);
    res.status(500).json({ error: 'Failed to generate voice' });
  }
});

// Get supported languages
router.get('/languages/supported', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const elevenLabsService = getElevenLabsService();
    const languages = elevenLabsService.getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    res.status(500).json({ error: 'Failed to fetch supported languages' });
  }
});

// Get suggested voice for language/gender/style
router.get('/suggest/:language/:gender/:style', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { language, gender, style } = req.params;
    
    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be male or female' });
    }
    
    if (!['professional', 'casual', 'energetic', 'warm'].includes(style)) {
      return res.status(400).json({ error: 'Style must be professional, casual, energetic, or warm' });
    }

    const elevenLabsService = getElevenLabsService();
    const suggestedVoiceId = elevenLabsService.getSuggestedVoice(
      language, 
      gender as 'male' | 'female', 
      style as 'professional' | 'casual' | 'energetic' | 'warm'
    );

    // Get full voice details
    const voice = await elevenLabsService.getVoice(suggestedVoiceId);

    res.json({
      suggestedVoiceId,
      voice: {
        ...voice,
        gender: voice.labels?.gender || gender,
        style: voice.labels?.use_case || style,
        language: voice.labels?.language || language,
      }
    });
  } catch (error) {
    console.error('Error getting suggested voice:', error);
    res.status(500).json({ error: 'Failed to get suggested voice' });
  }
});

// Get voice generation history for user
router.get('/history', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // This would typically come from a database
    // For now, return mock data
    res.json({
      generations: [
        {
          id: '1',
          voiceId: 'pNInz6obpgDQGcFmaJgB',
          voiceName: 'Adam',
          messageId: 'msg_1',
          text: 'Hello there! How are you doing today?',
          audioUrl: '/api/audio/generated_123.mp3',
          createdAt: new Date().toISOString(),
          duration: 3000,
          language: 'en',
          settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          }
        }
      ],
      pagination: {
        page,
        limit,
        total: 1,
        totalPages: 1,
      }
    });
  } catch (error) {
    console.error('Error fetching voice history:', error);
    res.status(500).json({ error: 'Failed to fetch voice history' });
  }
});

// Get voice settings for a specific voice
router.get('/:voiceId/settings', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { voiceId } = req.params;
    const elevenLabsService = getElevenLabsService();
    const voiceSettings = await elevenLabsService.getVoiceSettings(voiceId);
    res.json(voiceSettings);
  } catch (error) {
    console.error('Error fetching voice settings:', error);
    res.status(500).json({ error: 'Failed to fetch voice settings' });
  }
});

// Update voice settings
router.post('/:voiceId/settings', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const { voiceId } = req.params;
    const { stability, similarity_boost, style, use_speaker_boost } = req.body;

    const elevenLabsService = getElevenLabsService();
    const updatedSettings = await elevenLabsService.updateVoiceSettings(voiceId, {
      stability,
      similarity_boost,
      style,
      use_speaker_boost
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating voice settings:', error);
    res.status(500).json({ error: 'Failed to update voice settings' });
  }
});

// Test ElevenLabs connection
router.get('/test/connection', simpleAuth, async (req: SimpleAuthRequest, res) => {
  try {
    const elevenLabsService = getElevenLabsService();
    const isConnected = await elevenLabsService.testConnection();
    
    res.json({ 
      connected: isConnected,
      timestamp: new Date().toISOString(),
      service: 'ElevenLabs',
    });
  } catch (error) {
    console.error('Error testing ElevenLabs connection:', error);
    res.status(500).json({ 
      connected: false, 
      error: 'Connection test failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;