import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { analyzeTweetSentiment, analyzeTwitterCompetitors } from '../../services/twitter';

const router = express.Router();

// USP: Twitter Sentiment Analysis
router.post('/analyze-sentiment', authMiddleware, async (req, res) => {
  try {
    const { tweets } = req.body;

    // Simulate sentiment analysis
    await new Promise(resolve => setTimeout(resolve, 1800));

    const sentimentAnalysis = analyzeTweetSentiment(tweets);

    res.json({
      success: true,
      data: sentimentAnalysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiment'
    });
  }
});

// USP: Twitter Competitor Analysis
router.post('/analyze-competitors', authMiddleware, async (req, res) => {
  try {
    const { topic, tweetStyle, targetAudience } = req.body;

    // Simulate competitor analysis
    await new Promise(resolve => setTimeout(resolve, 2800));

    const competitorAnalysis = analyzeTwitterCompetitors(topic, tweetStyle, targetAudience);

    res.json({
      success: true,
      data: competitorAnalysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze competitors'
    });
  }
});

export default router;
