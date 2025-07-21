// External dependencies
import express from 'express';

// Types
import type { AuthenticatedRequest } from '../utils/jwt';

// Middleware
import { optionalAuth, normalizeUserMiddleware } from '../middleware/auth';

// Services
import { getCacheService, CacheKeys } from '../services/cache';
import { getElevenLabsService } from '../services/elevenlabs';

const router = express.Router();

// Debug endpoint to test ElevenLabs API directly
router.get('/debug', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const elevenLabsService = getElevenLabsService();

    // Test connection first
    const isConnected = await elevenLabsService.testConnection();

    if (!isConnected) {
      return res.json({
        error: 'ElevenLabs connection failed',
        connected: false
      });
    }

    // Get voices
    const voicesResponse = await elevenLabsService.getVoices();

    res.json({
      success: true,
      connected: true,
      voiceCount: voicesResponse.voices.length,
      hasMore: voicesResponse.has_more,
      voices: voicesResponse.voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels
      }))
    });

  } catch (error) {
    console.error('[DEBUG] Error testing ElevenLabs:', error);
    res.status(500).json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all available voices
router.get('/list', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const elevenLabsService = getElevenLabsService();
    const voicesResponse = await elevenLabsService.getVoices();


    // Ensure consistent data structure for frontend
    // const normalizedVoices = voicesResponse.voices.map(v => ({
    //   voice_id: v.voice_id,
    //   name: v.name,
    //   category: v.category,
    //   labels: v.labels,
    //   description: v.description,
    //   previewUrl: v.preview_url,
    //   available_for_tiers: v.available_for_tiers,
    //   settings: v.settings,
    //   // Add any additional properties from the SDK if they exist
    //   ...(v as any).fine_tuning && { fine_tuning: (v as any).fine_tuning },
    //   ...(v as any).high_quality_base_model_ids && { high_quality_base_model_ids: (v as any).high_quality_base_model_ids }
    // }));

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

// Get a specific voice by ID
router.get('/:voiceId', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { voiceId } = req.params;
    const elevenLabsService = getElevenLabsService();
    const voice = await elevenLabsService.getVoice(voiceId);

    // Normalize voice data structure for frontend consistency
    const normalizedVoice = {
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels: voice.labels,
      description: voice.description,
      previewUrl: voice.preview_url,
      available_for_tiers: voice.available_for_tiers,
      settings: voice.settings,
      // Add any additional properties from the SDK if they exist
      ...(voice as any).fine_tuning && { fine_tuning: (voice as any).fine_tuning },
      ...(voice as any).high_quality_base_model_ids && { high_quality_base_model_ids: (voice as any).high_quality_base_model_ids }
    };

    res.json(normalizedVoice);
  } catch (error) {
    console.error('Error fetching voice:', error);
    res.status(500).json({ error: 'Failed to fetch voice' });
  }
});

// Generate voice preview
router.post('/preview', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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
router.post('/generate-message', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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

    // Store the generated audio file using new storage strategy
    const userId = req.user?.userId || req.user?.id || 'default_user';
    const uploadResult = await elevenLabsService.uploadAudioToS3(
      audioResponse.audio_data,
      'message',
      userId,
      {
        messageId,
        voiceId,
        duration: audioResponse.duration_ms,
        originalText: text
      }
    );

    res.json({
      success: true,
      messageId,
      audioUrl: uploadResult.url,
      audioKey: uploadResult.key,
      voiceId,
      filename: audioResponse.filename,
      duration: audioResponse.duration_ms,
      settings: voiceSettings,
      expiresAt: uploadResult.expiresAt,
    });

  } catch (error) {
    console.error('Error generating message speech:', error);
    res.status(500).json({ error: 'Failed to generate message speech' });
  }
});

// Generate speech for multiple messages (batch)
router.post('/generate-batch', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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

    // Upload all generated audio files using new storage strategy
    const userId = req.user?.userId || req.user?.id || 'default_user';
    const uploadPromises = results.map(async (result) => {
      const uploadResult = await elevenLabsService.uploadAudioToS3(
        result.audioResponse.audio_data,
        'message',
        userId,
        {
          messageId: result.messageId,
          duration: result.audioResponse.duration_ms,
          originalText: messages.find(m => m.id === result.messageId)?.text || 'Batch message'
        }
      );

      return {
        messageId: result.messageId,
        audioUrl: uploadResult.url,
        audioKey: uploadResult.key,
        filename: result.audioResponse.filename,
        duration: result.audioResponse.duration_ms,
        expiresAt: uploadResult.expiresAt,
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

// Generate voiceover audio (new endpoint that matches frontend expectations)
router.post('/generate-voiceover-audio', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { script, selectedVoiceId, stability, similarity, ownerId } = req.body;

    if (!script || !selectedVoiceId) {
      return res.status(400).json({
        error: 'Script and selectedVoiceId are required'
      });
    }

    const elevenLabsService = getElevenLabsService();

    // Use provided settings or optimal settings
    let voiceSettings;
    if (stability !== undefined || similarity !== undefined) {
      voiceSettings = {
        stability: stability !== undefined ? stability : 0.5,
        similarity_boost: similarity !== undefined ? similarity : 0.8,
        style: 0.0,
        use_speaker_boost: true,
      };
    } else {
      voiceSettings = elevenLabsService.getOptimalVoiceSettings('en', 'normal');
    }

    console.log(`[Voice] Generating voiceover audio for voice: ${selectedVoiceId}`);

    const audioResponse = await elevenLabsService.generateSpeech({
      voice_id: selectedVoiceId,
      text: script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
    });

    // Upload to S3 using new storage strategy
    const userId = req.user?.userId || req.user?.id || 'default_user';
    const uploadResult = await elevenLabsService.uploadAudioToS3(
      audioResponse.audio_data,
      'voiceover',
      ownerId || userId,
      {
        voiceId: selectedVoiceId,
        duration: audioResponse.duration_ms,
        originalText: script
      }
    );

    console.log(`[Voice] Voiceover generated and uploaded successfully: ${uploadResult.url}`);

    res.json({
      success: true,
      audio_url: uploadResult.url,
      audioKey: uploadResult.key,
      voiceId: selectedVoiceId,
      filename: audioResponse.filename,
      duration: audioResponse.duration_ms,
      settings: voiceSettings,
      expiresAt: uploadResult.expiresAt,
      environment: process.env.NODE_ENV || 'development',
    });

  } catch (error) {
    console.error('Error generating voiceover audio:', error);
    res.status(500).json({
      error: 'Failed to generate voiceover audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate full voice for text story (legacy endpoint for backward compatibility)
router.post('/generate', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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

    // Store the generated audio file using new storage strategy
    const userId = req.user?.userId || req.user?.id || 'default_user';
    const uploadResult = await elevenLabsService.uploadAudioToS3(
      audioResponse.audio_data,
      'voiceover',
      userId,
      {
        voiceId,
        duration: audioResponse.duration_ms,
        originalText: text
      }
    );

    res.json({
      success: true,
      audioUrl: uploadResult.url,
      audioKey: uploadResult.key,
      voiceId,
      personId,
      filename: audioResponse.filename,
      duration: audioResponse.duration_ms,
      settings: voiceSettings,
      expiresAt: uploadResult.expiresAt,
    });

  } catch (error) {
    console.error('Error generating voice:', error);
    res.status(500).json({ error: 'Failed to generate voice' });
  }
});

// Get supported languages
router.get('/languages/supported', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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
router.get('/suggest/:language/:gender/:style', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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
router.get('/history', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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
router.get('/:voiceId/settings', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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
router.post('/:voiceId/settings', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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
router.get('/test/connection', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
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

// Cache management endpoints
router.get('/cache/stats', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const cacheService = getCacheService();
    const stats = await cacheService.getStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      details: error instanceof Error ? error.message : 'Cache service not available'
    });
  }
});

// Clear voice cache
router.delete('/cache/clear', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const cacheService = getCacheService();

    // Clear specific voice-related cache keys
    await cacheService.delete(CacheKeys.VOICES_LIST);

    // Clear voice details cache (this would need enhancement for bulk delete)
    // For now, we'll just clear the main voices list

    const userId = req.user?.userId || req.user?.id || 'anonymous';
    console.log('[Cache] Voice cache cleared by user:', userId);

    res.json({
      success: true,
      message: 'Voice cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error clearing voice cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Cache service not available'
    });
  }
});

// Refresh voice cache (clear and prefetch)
router.post('/cache/refresh', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const cacheService = getCacheService();
    const elevenLabsService = getElevenLabsService();

    // Clear existing cache
    await cacheService.delete(CacheKeys.VOICES_LIST);

    // Prefetch fresh data
    const startTime = Date.now();
    const voices = await elevenLabsService.getVoices();
    const fetchTime = Date.now() - startTime;

    const userId = req.user?.userId || req.user?.id || 'anonymous';
    console.log(`[Cache] Voice cache refreshed by user: ${userId} (took ${fetchTime}ms)`);

    res.json({
      success: true,
      message: 'Voice cache refreshed successfully',
      voiceCount: voices.voices.length,
      fetchTime: `${fetchTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error refreshing voice cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Audio storage management endpoints
router.get('/storage/stats', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { getS3Service } = await import('../services/s3');
    const { getAudioStorageConfig } = await import('../config/audioStorage');

    const s3Service = getS3Service();
    const config = getAudioStorageConfig();

    const stats = await s3Service.getAudioStorageStats();

    res.json({
      success: true,
      stats,
      config: {
        bucket: config.bucket,
        environment: process.env.NODE_ENV,
        retention: config.retention
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting audio storage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manual cleanup endpoint (useful for testing or immediate cleanup)
router.post('/storage/cleanup', optionalAuth, normalizeUserMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { runManualCleanup } = await import('../workers/audioCleanup');

    console.log(`[Voice] Manual cleanup requested by user: ${req.user?.userId || 'anonymous'}`);

    const result = await runManualCleanup();

    res.json({
      success: result.success,
      deletedCount: result.deletedCount,
      errors: result.errors,
      stats: result.stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running manual cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
