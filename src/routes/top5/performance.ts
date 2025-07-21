import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { performanceService } from '../../services/top5/performanceService';
import { isDevelopment } from '../../config';

const router = express.Router();

/**
 * @route POST /api/top5/performance/predict
 * @desc Predict performance metrics for Top 5 content
 * @access Private
 */
router.post('/predict', authMiddleware, async (req, res) => {
  try {
    const { items, configuration, targetPlatforms, publishingSchedule } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    if (!targetPlatforms || !Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Target platforms array is required and must not be empty'
      });
    }

    const predictionResult = await performanceService.predictPerformance({
      items,
      configuration,
      targetPlatforms,
      publishingSchedule
    });

    res.json({
      success: true,
      data: predictionResult
    });
  } catch (error) {
    console.error('[Top5 Performance] Error predicting performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict performance',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/performance/competitors
 * @desc Analyze competitors in the same space
 * @access Private
 */
router.post('/competitors', authMiddleware, async (req, res) => {
  try {
    const { topic, category, platform, timeframe = '30d' } = req.body;

    if (!topic || !category || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Topic, category, and platform are required'
      });
    }

    const competitorAnalysis = await performanceService.analyzeCompetitors({
      topic,
      category,
      platform,
      timeframe
    });

    res.json({
      success: true,
      data: competitorAnalysis
    });
  } catch (error) {
    console.error('[Top5 Performance] Error analyzing competitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze competitors',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/performance/engagement-metrics
 * @desc Calculate engagement metrics for specific content
 * @access Private
 */
router.post('/engagement-metrics', authMiddleware, async (req, res) => {
  try {
    const { views, platform, contentType = 'top5' } = req.body;

    if (!views || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Views and platform are required'
      });
    }

    if (typeof views !== 'number' || views < 0) {
      return res.status(400).json({
        success: false,
        error: 'Views must be a positive number'
      });
    }

    const engagementMetrics = performanceService.calculateEngagementMetrics(
      views,
      platform,
      contentType
    );

    res.json({
      success: true,
      data: {
        views,
        platform,
        contentType,
        metrics: engagementMetrics,
        calculatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Performance] Error calculating engagement metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate engagement metrics',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/performance/posting-schedule
 * @desc Optimize posting schedule for multiple platforms
 * @access Private
 */
router.post('/posting-schedule', authMiddleware, async (req, res) => {
  try {
    const { platforms, timezone = 'UTC' } = req.body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Platforms array is required and must not be empty'
      });
    }

    const schedule = performanceService.optimizePostingSchedule(platforms, timezone);

    res.json({
      success: true,
      data: {
        optimizedSchedule: schedule,
        timezone,
        platforms: platforms.length,
        generatedAt: new Date().toISOString(),
        recommendations: [
          'Post during platform-specific peak hours for maximum reach',
          'Consider audience time zones when scheduling',
          'Monitor initial performance and adjust timing accordingly',
          'Use scheduling tools to maintain consistency'
        ]
      }
    });
  } catch (error) {
    console.error('[Top5 Performance] Error optimizing posting schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize posting schedule',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/performance/platform-insights/:platform
 * @desc Get platform-specific insights and recommendations
 * @access Private
 */
router.get('/platform-insights/:platform', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.params;

    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Platform parameter is required'
      });
    }

    // Get platform-specific insights
    const insights = {
      platform: platform,
      demographics: performanceService['getPlatformDemographics'](platform),
      optimalTime: performanceService['getPlatformOptimalTime'](platform),
      competitionLevel: performanceService['getCompetitionLevel'](platform),
      engagementRates: performanceService.calculateEngagementMetrics(100000, platform, 'top5'),
      recommendations: performanceService['getPlatformSpecificTips'](platform, []),
      contentGuidelines: getPlatformContentGuidelines(platform),
      hashtagStrategy: getHashtagStrategy(platform),
      monetization: getMonetizationInfo(platform)
    };

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('[Top5 Performance] Error getting platform insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform insights',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/performance/cross-platform-analysis
 * @desc Analyze performance potential across multiple platforms
 * @access Private
 */
router.post('/cross-platform-analysis', authMiddleware, async (req, res) => {
  try {
    const { items, configuration, platforms } = req.body;

    if (!items || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        error: 'Items and platforms array are required'
      });
    }

    const predictions = await performanceService.predictPerformance({
      items,
      configuration,
      targetPlatforms: platforms
    });

    // Calculate cross-platform insights
    const crossPlatformAnalysis = {
      totalPlatforms: platforms.length,
      bestPerformingPlatform: predictions.predictions.reduce((best, current) =>
        current.viralChance > best.viralChance ? current : best
      ),
      totalReach: predictions.predictions.reduce((sum, pred) => {
        const views = parseFloat(pred.expectedViews.replace(/[^\d.]/g, '')) || 0;
        const multiplier = pred.expectedViews.includes('M') ? 1000000 :
                          pred.expectedViews.includes('K') ? 1000 : 1;
        return sum + (views * multiplier);
      }, 0),
      avgViralChance: Math.round(
        predictions.predictions.reduce((sum, pred) => sum + pred.viralChance, 0) / platforms.length
      ),
      platformComparison: predictions.predictions.map(pred => ({
        platform: pred.platform,
        viralChance: pred.viralChance,
        expectedViews: pred.expectedViews,
        competitionLevel: pred.competitionLevel,
        demographicReach: pred.demographicReach
      }))
    };

    res.json({
      success: true,
      data: {
        ...predictions,
        crossPlatformAnalysis,
        analysisDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Performance] Error in cross-platform analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform cross-platform analysis',
      details: isDevelopment() ? error : undefined
    });
  }
});

// Helper methods (would typically be in a utility class)
function getPlatformContentGuidelines(platform: string): string[] {
  const guidelines = {
    tiktok: [
      'Keep videos under 60 seconds for optimal reach',
      'Use trending sounds and hashtags',
      'Vertical format (9:16) is essential',
      'Hook viewers in first 3 seconds',
      'Include captions for accessibility'
    ],
    instagram: [
      'Square (1:1) or vertical (4:5) format works best',
      'Use high-quality visuals',
      'Write engaging captions with call-to-actions',
      'Utilize all 10 hashtag slots strategically',
      'Post consistently to maintain algorithm favor'
    ],
    youtube: [
      'Create compelling thumbnails and titles',
      'Optimize for search with relevant keywords',
      'Include detailed descriptions',
      'Use end screens and cards for engagement',
      'Maintain good watch time and retention'
    ],
    twitter: [
      'Keep videos under 2 minutes and 20 seconds',
      'Use relevant hashtags (1-2 per tweet)',
      'Thread longer content for better engagement',
      'Post during peak hours for your audience',
      'Engage with replies quickly'
    ]
  };

  return guidelines[platform.toLowerCase() as keyof typeof guidelines] || [
    'Follow platform best practices',
    'Optimize content for target audience',
    'Use platform-specific features',
    'Monitor analytics and adjust strategy'
  ];
}

function getHashtagStrategy(platform: string): {
  recommended: number;
  types: string[];
  examples: string[];
} {
  const strategies = {
    tiktok: {
      recommended: 5,
      types: ['Trending', 'Niche', 'Branded', 'Community', 'General'],
      examples: ['#fyp', '#viral', '#top5', '#countdown', '#trending']
    },
    instagram: {
      recommended: 8,
      types: ['Popular', 'Niche', 'Branded', 'Location', 'Community'],
      examples: ['#top5', '#viral', '#countdown', '#explore', '#instagood']
    },
    youtube: {
      recommended: 10,
      types: ['Keyword-rich', 'Niche', 'Trending', 'Descriptive'],
      examples: ['#Top5', '#Countdown', '#List', '#MustWatch', '#Viral']
    },
    twitter: {
      recommended: 2,
      types: ['Trending', 'Relevant', 'Community'],
      examples: ['#Top5', '#Thread', '#Viral']
    }
  };

  return strategies[platform.toLowerCase() as keyof typeof strategies] || {
    recommended: 5,
    types: ['Relevant', 'Popular', 'Niche'],
    examples: ['#top5', '#list', '#viral']
  };
}

function getMonetizationInfo(platform: string): {
  available: boolean;
  requirements: string[];
  revenueStreams: string[];
} {
  const monetization = {
    tiktok: {
      available: true,
      requirements: ['10K+ followers', '100K+ video views in 30 days', 'Age 18+'],
      revenueStreams: ['Creator Fund', 'Brand partnerships', 'Live gifts', 'Merchandise']
    },
    instagram: {
      available: true,
      requirements: ['1K+ followers', 'Professional account', 'Compliance with policies'],
      revenueStreams: ['Reels Play Bonus', 'Brand partnerships', 'Instagram Shop', 'IGTV ads']
    },
    youtube: {
      available: true,
      requirements: ['1K+ subscribers', '4K+ watch hours', 'YouTube Partner Program'],
      revenueStreams: ['Ad revenue', 'Channel memberships', 'Super Chat', 'Merchandise shelf']
    },
    twitter: {
      available: false,
      requirements: ['Limited monetization options'],
      revenueStreams: ['Tip Jar', 'Super Follows', 'Brand partnerships']
    }
  };

  return monetization[platform.toLowerCase() as keyof typeof monetization] || {
    available: false,
    requirements: ['Check platform guidelines'],
    revenueStreams: ['Brand partnerships', 'Affiliate marketing']
  };
}

export default router;
