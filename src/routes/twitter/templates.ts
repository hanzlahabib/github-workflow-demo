import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { generateAITweets, getViralTwitterTemplates } from '../../services/twitter';

const router = express.Router();

// USP: AI Tweet Generator
router.post('/generate-ai-tweets', authMiddleware, async (req, res) => {
  try {
    const {
      topic,
      tweetStyle,
      tweetCount,
      targetAudience,
      viralFactor,
      includeThread
    } = req.body;

    // Simulate AI tweet generation
    await new Promise(resolve => setTimeout(resolve, 2500));

    const generatedTweets = generateAITweets({
      topic,
      tweetStyle,
      tweetCount,
      targetAudience,
      viralFactor,
      includeThread
    });

    res.json({
      success: true,
      data: generatedTweets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI tweets'
    });
  }
});

// USP: Viral Templates Gallery
router.get('/viral-templates', authMiddleware, async (req, res) => {
  try {
    const { category = 'all', sortBy = 'viral' } = req.query;

    const templates = getViralTwitterTemplates(category as string, sortBy as string);

    res.json({
      success: true,
      data: {
        templates,
        categories: [
          'viral', 'threads', 'news', 'comedy', 'controversy',
          'educational', 'inspirational', 'tech', 'lifestyle', 'business'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load viral templates'
    });
  }
});

export default router;
