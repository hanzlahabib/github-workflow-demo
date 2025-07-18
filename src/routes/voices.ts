import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../utils/jwt';
import { getElevenLabsService } from '../services/elevenlabs';

const router = express.Router();

// Get all available voices
router.get('/list', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const elevenLabsService = getElevenLabsService();
    const voices = await elevenLabsService.getVoices();
    res.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// Generate voice preview
router.post('/preview', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { voiceId, text } = req.body;

    if (!voiceId || !text) {
      return res.status(400).json({ error: 'Voice ID and text are required' });
    }

    // Limit preview text length
    const previewText = text.substring(0, 100);
    
    const elevenLabsService = getElevenLabsService();
    const audioBuffer = await elevenLabsService.generateSpeech({
      voice_id: voiceId,
      text: previewText,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating voice preview:', error);
    res.status(500).json({ error: 'Failed to generate voice preview' });
  }
});

// Generate full voice for text story
router.post('/generate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { voiceId, text, personId, stability = 0.5, similarity = 0.5, style = 0.0 } = req.body;

    if (!voiceId || !text || !personId) {
      return res.status(400).json({ error: 'Voice ID, text, and person ID are required' });
    }

    // Generate speech with custom settings
    const elevenLabsService = getElevenLabsService();
    const audioBuffer = await elevenLabsService.generateSpeech({
      voice_id: voiceId,
      text: text,
      model_id: 'eleven_multilingual_v2', // Use multilingual for better quality
      voice_settings: {
        stability: stability,
        similarity_boost: similarity,
        style: style,
        use_speaker_boost: true
      }
    });

    // Store the generated audio file
    const audioKey = `voices/${req.user.id}/${personId}_${Date.now()}.mp3`;
    const audioUrl = await elevenLabsService.uploadToS3(audioBuffer, audioKey);

    res.json({
      success: true,
      audioUrl,
      audioKey,
      voiceId,
      personId,
      duration: Math.ceil(text.length / 10) // Rough estimate of duration in seconds
    });

  } catch (error) {
    console.error('Error generating voice:', error);
    res.status(500).json({ error: 'Failed to generate voice' });
  }
});

// Get voice generation history for user
router.get('/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // This would typically come from a database
    // For now, return mock data
    res.json({
      generations: [
        {
          id: '1',
          voiceId: 'voice_123',
          voiceName: 'Alice',
          personId: 'left',
          text: 'Hello there! How are you doing today?',
          audioUrl: '/api/audio/generated_123.mp3',
          createdAt: new Date().toISOString(),
          duration: 3
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching voice history:', error);
    res.status(500).json({ error: 'Failed to fetch voice history' });
  }
});

// Get voice settings for a specific voice
router.get('/:voiceId/settings', authenticateToken, async (req: AuthRequest, res) => {
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
router.post('/:voiceId/settings', authenticateToken, async (req: AuthRequest, res) => {
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

export { router as voiceRoutes };