import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { trendingService } from '../../services/top5/trendingService';
import { isDevelopment } from '../../config';

const router = express.Router();

/**
 * @route GET /api/top5/trending/topics
 * @desc Analyze trending topics for Top 5 content
 * @access Private
 */
router.get('/topics', authMiddleware, async (req, res) => {
  try {
    const {
      category = 'general',
      platform = 'all',
      timeframe = '24h',
      region = 'global'
    } = req.query;

    const analysisResult = await trendingService.analyzeTrendingTopics({
      category: category as string,
      platform: platform as string,
      timeframe: timeframe as '24h' | '7d' | '30d',
      region: region as string
    });

    res.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    console.error('[Top5 Trending] Error analyzing trending topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze trending topics',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/trending/platform/:platform
 * @desc Get trending topics for specific platform
 * @access Private
 */
router.get('/platform/:platform', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.params;
    const { limit = 10 } = req.query;

    const topics = await trendingService.getTrendingTopicsForPlatform(
      platform,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: {
        platform,
        topics,
        generatedAt: new Date().toISOString(),
        totalCount: topics.length
      }
    });
  } catch (error) {
    console.error('[Top5 Trending] Error getting platform topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform-specific trending topics',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/trending/predict-viral
 * @desc Predict viral potential of a topic
 * @access Private
 */
router.post('/predict-viral', authMiddleware, async (req, res) => {
  try {
    const { topic, category, platform } = req.body;

    if (!topic || !category || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Topic, category, and platform are required'
      });
    }

    const viralPrediction = trendingService.predictViralPotential(topic, category, platform);

    res.json({
      success: true,
      data: {
        topic,
        category,
        platform,
        prediction: viralPrediction,
        analyzedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Trending] Error predicting viral potential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict viral potential',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/trending/categories
 * @desc Get available trending categories with stats
 * @access Private
 */
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    // Get sample data from general category to understand available categories
    const generalTopics = await trendingService.analyzeTrendingTopics({
      category: 'general',
      platform: 'all'
    });

    // Extract unique categories and their stats
    const categoryStats = generalTopics.topics.reduce((stats, topic) => {
      if (!stats[topic.category]) {
        stats[topic.category] = {
          name: topic.category,
          count: 0,
          avgViralScore: 0,
          totalEngagement: 0
        };
      }

      stats[topic.category].count += 1;
      stats[topic.category].avgViralScore += topic.viralScore;
      stats[topic.category].totalEngagement += parseFloat(topic.engagement.replace(/[^\d.]/g, ''));

      return stats;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.values(categoryStats).forEach((stat: any) => {
      stat.avgViralScore = Math.round(stat.avgViralScore / stat.count);
      stat.totalEngagement = `${(stat.totalEngagement / stat.count).toFixed(1)}M`;
    });

    res.json({
      success: true,
      data: {
        categories: Object.values(categoryStats),
        totalCategories: Object.keys(categoryStats).length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Trending] Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending categories',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/trending/insights
 * @desc Get trending insights and analytics
 * @access Private
 */
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const { category = 'general', timeframe = '24h' } = req.query;

    // Get trending data
    const trendingData = await trendingService.analyzeTrendingTopics({
      category: category as string,
      timeframe: timeframe as '24h' | '7d' | '30d'
    });

    // Calculate insights
    const insights = {
      totalTopics: trendingData.topics.length,
      avgViralScore: Math.round(
        trendingData.topics.reduce((sum, topic) => sum + topic.viralScore, 0) / trendingData.topics.length
      ),
      topPerformers: trendingData.topics.slice(0, 3).map(topic => ({
        topic: topic.topic,
        viralScore: topic.viralScore,
        engagement: topic.engagement
      })),
      categoryDistribution: trendingData.topics.reduce((dist, topic) => {
        dist[topic.category] = (dist[topic.category] || 0) + 1;
        return dist;
      }, {} as Record<string, number>),
      sentimentAnalysis: {
        positive: trendingData.topics.filter(t => t.sentiment === 'positive').length,
        negative: trendingData.topics.filter(t => t.sentiment === 'negative').length,
        neutral: trendingData.topics.filter(t => t.sentiment === 'neutral').length
      },
      trends: {
        rising: trendingData.topics.filter(t => t.growth && parseFloat(t.growth.replace('%', '')) > 50).length,
        declining: trendingData.topics.filter(t => t.growth && parseFloat(t.growth.replace('%', '')) < 10).length
      }
    };

    res.json({
      success: true,
      data: {
        insights,
        period: timeframe,
        category,
        generatedAt: trendingData.generatedAt
      }
    });
  } catch (error) {
    console.error('[Top5 Trending] Error getting insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate trending insights',
      details: isDevelopment() ? error : undefined
    });
  }
});

export default router;
