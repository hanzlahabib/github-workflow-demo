import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { optimizationService } from '../../services/top5/optimizationService';
import { isDevelopment } from '../../config';

const router = express.Router();

/**
 * @route POST /api/top5/optimization/suggestions
 * @desc Generate comprehensive optimization suggestions
 * @access Private
 */
router.post('/suggestions', authMiddleware, async (req, res) => {
  try {
    const {
      items,
      configuration,
      styling,
      targetPlatforms,
      targetAudience,
      goals = []
    } = req.body;

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

    const optimizationRequest = {
      items,
      configuration: configuration || {},
      styling: styling || {},
      targetPlatforms,
      targetAudience,
      goals
    };

    const optimizationResult = await optimizationService.generateOptimizations(optimizationRequest);

    res.json({
      success: true,
      data: {
        ...optimizationResult,
        summary: {
          totalSuggestions: optimizationResult.suggestions.length,
          highPrioritySuggestions: optimizationResult.suggestions.filter(s => s.priority === 'high').length,
          expectedImprovement: `+${optimizationResult.improvement} viral score points`,
          primaryFocusAreas: optimizationResult.suggestions
            .filter(s => s.priority === 'high')
            .map(s => s.category)
            .filter((cat, index, arr) => arr.indexOf(cat) === index)
            .slice(0, 3)
        }
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimization suggestions',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/optimization/accessibility
 * @desc Optimize content for accessibility
 * @access Private
 */
router.post('/accessibility', authMiddleware, async (req, res) => {
  try {
    const { styling } = req.body;

    if (!styling) {
      return res.status(400).json({
        success: false,
        error: 'Styling object is required'
      });
    }

    const a11yOptimization = optimizationService.optimizeAccessibility(styling);

    if (!a11yOptimization) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate accessibility optimization'
      });
    }

    res.json({
      success: true,
      data: {
        accessibility: a11yOptimization,
        analyzedAt: new Date().toISOString(),
        compliance: {
          wcagLevel: (a11yOptimization.accessibilityScore || 0) >= 80 ? 'AA' :
                    (a11yOptimization.accessibilityScore || 0) >= 60 ? 'A' : 'Non-compliant',
          overallGrade: getAccessibilityGrade(a11yOptimization.accessibilityScore || 0),
          criticalIssues: (a11yOptimization.improvements || []).filter(imp =>
            imp.includes('contrast') || imp.includes('readability')
          ).length
        },
        recommendations: {
          immediate: (a11yOptimization.improvements || []).slice(0, 3),
          longTerm: (a11yOptimization.improvements || []).slice(3),
          impact: 'Improved accessibility increases reach and compliance'
        }
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error optimizing accessibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize accessibility',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/optimization/seo
 * @desc Optimize content for SEO and discoverability
 * @access Private
 */
router.post('/seo', authMiddleware, async (req, res) => {
  try {
    const { items, category, platform = 'youtube' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    const seoOptimization = optimizationService.optimizeSEO(items, category, platform);

    res.json({
      success: true,
      data: {
        seo: seoOptimization,
        platform,
        category,
        analyzedAt: new Date().toISOString(),
        actionPlan: {
          immediate: [
            `Use optimized title: "${seoOptimization.titleOptimization.optimized}"`,
            `Implement recommended tags: ${seoOptimization.tags.recommended.slice(0, 5).join(', ')}`,
            'Update description with keyword optimization'
          ],
          ongoing: [
            'Monitor trending tags and update accordingly',
            'A/B test different title variations',
            'Track keyword performance and adjust strategy'
          ]
        },
        performance: {
          metaScore: seoOptimization.metaScore,
          discoverabilityRating: getDiscoverabilityRating(seoOptimization.metaScore),
          keywordDensity: seoOptimization.titleOptimization.keywordDensity,
          readabilityScore: seoOptimization.titleOptimization.readabilityScore
        }
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error optimizing SEO:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize SEO',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/optimization/posting-schedule
 * @desc Optimize posting schedule for maximum reach
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

    const schedule = optimizationService.optimizePostingSchedule(platforms, timezone);

    // Generate additional insights
    const insights = {
      crossPlatformStrategy: generateCrossPlatformStrategy(schedule),
      timeZoneRecommendations: getTimeZoneRecommendations(timezone),
      weeklyPattern: getOptimalWeeklyPattern(platforms),
      seasonalAdjustments: getSeasonalAdjustments()
    };

    res.json({
      success: true,
      data: {
        optimizedSchedule: schedule,
        insights,
        timezone,
        totalPlatforms: platforms.length,
        generatedAt: new Date().toISOString(),
        implementation: {
          priority: 'High - Timing significantly affects viral potential',
          effort: 'Low - Can be automated with scheduling tools',
          expectedImpact: '+15-25% increase in initial engagement',
          tools: ['Buffer', 'Hootsuite', 'Later', 'Creator Studio']
        }
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error optimizing posting schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize posting schedule',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/optimization/platform-variations
 * @desc Generate platform-specific content variations
 * @access Private
 */
router.post('/platform-variations', authMiddleware, async (req, res) => {
  try {
    const { items, configuration, targetPlatforms } = req.body;

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

    const variations = optimizationService.generatePlatformVariations(
      items,
      configuration || {},
      targetPlatforms
    );

    // Add platform-specific insights
    const enhancedVariations = variations.map(variation => ({
      ...variation,
      insights: {
        keyDifferences: getKeyDifferences(items, variation.optimizedItems),
        platformBenefits: getPlatformBenefits(variation.platform),
        expectedPerformance: getExpectedPerformance(variation.platform, variation.optimizedItems)
      }
    }));

    res.json({
      success: true,
      data: {
        variations: enhancedVariations,
        originalItems: items,
        totalPlatforms: targetPlatforms.length,
        generatedAt: new Date().toISOString(),
        strategy: {
          approach: 'Platform-specific optimization for maximum engagement',
          benefits: [
            'Increased relevance for each platform audience',
            'Better algorithm performance',
            'Higher engagement rates',
            'Improved reach and discoverability'
          ],
          implementation: 'Create separate versions for each platform using the optimized content'
        }
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error generating platform variations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate platform variations',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/optimization/a-b-test-variants
 * @desc Generate A/B test variants for optimization
 * @access Private
 */
router.post('/a-b-test-variants', authMiddleware, async (req, res) => {
  try {
    const {
      items,
      configuration,
      testType = 'titles', // titles, thumbnails, timing, format
      variantCount = 3
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    if (variantCount < 2 || variantCount > 5) {
      return res.status(400).json({
        success: false,
        error: 'Variant count must be between 2 and 5'
      });
    }

    const variants = generateABTestVariants(items, configuration, testType, variantCount);

    res.json({
      success: true,
      data: {
        originalContent: { items, configuration },
        variants,
        testType,
        testPlan: {
          duration: '7-14 days',
          sampleSize: 'Minimum 1000 views per variant',
          metrics: getABTestMetrics(testType),
          successCriteria: getSuccessCriteria(testType)
        },
        implementation: {
          randomization: '50/25/25 split for 3 variants',
          tracking: 'UTM parameters and analytics tags required',
          analysis: 'Statistical significance at 95% confidence level'
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error generating A/B test variants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate A/B test variants',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/optimization/viral-hooks
 * @desc Generate viral hooks and attention-grabbing elements
 * @access Private
 */
router.post('/viral-hooks', authMiddleware, async (req, res) => {
  try {
    const { items, targetAudience = 'Gen Z', platform = 'tiktok' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    const hooks = generateViralHooks(items, targetAudience, platform);

    res.json({
      success: true,
      data: {
        hooks,
        targetAudience,
        platform,
        implementation: {
          placement: 'Use hooks in first 3 seconds of video',
          variations: 'Test different hooks for same content',
          psychology: 'Hooks tap into curiosity, FOMO, and emotional triggers'
        },
        performance: {
          expectedImprovement: '+30-50% in retention rate',
          criticalWindow: 'First 3 seconds determine 70% of engagement',
          successRate: 'Proper hooks increase viral potential by 2-3x'
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error generating viral hooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate viral hooks',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/optimization/best-practices/:platform
 * @desc Get platform-specific optimization best practices
 * @access Private
 */
router.get('/best-practices/:platform', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.params;

    if (!platform) {
      return res.status(400).json({
        success: false,
        error: 'Platform parameter is required'
      });
    }

    const bestPractices = getPlatformBestPractices(platform);

    res.json({
      success: true,
      data: {
        platform,
        bestPractices,
        lastUpdated: new Date().toISOString(),
        applicability: 'Current as of 2024 - platform guidelines may change'
      }
    });
  } catch (error) {
    console.error('[Top5 Optimization] Error getting best practices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get best practices',
      details: isDevelopment() ? error : undefined
    });
  }
});

// Helper methods
function getAccessibilityGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 55) return 'D';
  return 'F';
}

function getDiscoverabilityRating(metaScore: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (metaScore >= 85) return 'excellent';
  if (metaScore >= 70) return 'good';
  if (metaScore >= 55) return 'fair';
  return 'poor';
}

function generateCrossPlatformStrategy(schedule: any[]): {
  sequence: string[];
  reasoning: string[];
  timing: string;
} {
  const sortedPlatforms = [...schedule].sort((a, b) => {
    const priority = { tiktok: 5, instagram: 4, youtube: 3, twitter: 2, facebook: 1 };
    return (priority[b.platform.toLowerCase() as keyof typeof priority] || 0) -
           (priority[a.platform.toLowerCase() as keyof typeof priority] || 0);
  });

  return {
    sequence: sortedPlatforms.map(s => s.platform),
    reasoning: [
      'Start with highest viral potential platform',
      'Allow 2-4 hours for momentum to build',
      'Cross-promote to secondary platforms',
      'Monitor performance and adjust timing'
    ],
    timing: 'Stagger posts 2-4 hours apart for optimal cross-platform synergy'
  };
}

function getTimeZoneRecommendations(timezone: string): {
  primary: string;
  alternatives: string[];
  reasoning: string;
} {
  const recommendations = {
    'UTC': {
      primary: 'EST (UTC-5)',
      alternatives: ['PST (UTC-8)', 'CST (UTC-6)'],
      reasoning: 'US Eastern Time captures largest English-speaking audience'
    },
    'EST': {
      primary: 'EST (UTC-5)',
      alternatives: ['GMT (UTC+0)', 'PST (UTC-8)'],
      reasoning: 'Optimal for North American audience engagement'
    }
  };

  return recommendations[timezone as keyof typeof recommendations] || {
    primary: 'EST (UTC-5)',
    alternatives: ['GMT (UTC+0)', 'PST (UTC-8)'],
    reasoning: 'Consider your primary audience location for optimal timing'
  };
}

function getOptimalWeeklyPattern(platforms: string[]): {
  bestDays: string[];
  avoidDays: string[];
  reasoning: string;
} {
  return {
    bestDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    avoidDays: ['Monday', 'Sunday'],
    reasoning: 'Mid-week posts typically perform better due to higher engagement rates'
  };
}

function getSeasonalAdjustments(): {
  spring: string;
  summer: string;
  fall: string;
  winter: string;
} {
  return {
    spring: 'Focus on renewal and fresh content themes',
    summer: 'Earlier posting times due to outdoor activities',
    fall: 'Back-to-school content performs well',
    winter: 'Holiday-themed content and cozy indoor themes'
  };
}

function getKeyDifferences(original: any[], optimized: any[]): string[] {
  const differences: string[] = [];

  // Compare title lengths
  const originalAvgLength = original.reduce((sum, item) => sum + item.title.length, 0) / original.length;
  const optimizedAvgLength = optimized.reduce((sum, item) => sum + item.title.length, 0) / optimized.length;

  if (Math.abs(originalAvgLength - optimizedAvgLength) > 5) {
    differences.push(`Title length adjusted (${originalAvgLength.toFixed(0)} → ${optimizedAvgLength.toFixed(0)} chars)`);
  }

  // Check for added emotional words
  const originalEmotional = original.filter(item =>
    /amazing|incredible|shocking/i.test(item.title)
  ).length;
  const optimizedEmotional = optimized.filter(item =>
    /amazing|incredible|shocking/i.test(item.title)
  ).length;

  if (optimizedEmotional > originalEmotional) {
    differences.push('Added emotional triggers for better engagement');
  }

  return differences.slice(0, 3);
}

function getPlatformBenefits(platform: string): string[] {
  const benefits = {
    tiktok: [
      'Optimized for vertical mobile viewing',
      'Trend-aware content adaptation',
      'Youth-focused language and style'
    ],
    instagram: [
      'Visual-first optimization',
      'Hashtag strategy integration',
      'Story and Reels compatibility'
    ],
    youtube: [
      'Search-optimized titles',
      'Longer-form content support',
      'Better retention hooks'
    ],
    twitter: [
      'Concise, shareable format',
      'Thread-friendly structure',
      'Real-time engagement optimization'
    ]
  };

  return benefits[platform.toLowerCase() as keyof typeof benefits] || [
    'Platform-specific optimization',
    'Audience-tailored content',
    'Algorithm-friendly formatting'
  ];
}

function getExpectedPerformance(platform: string, items: any[]): {
  engagementLift: string;
  reachImprovement: string;
  viralPotential: string;
} {
  return {
    engagementLift: '+15-25%',
    reachImprovement: '+20-35%',
    viralPotential: '+30-50%'
  };
}

function generateABTestVariants(items: any[], configuration: any, testType: string, variantCount: number): any[] {
  const variants = [];

  for (let i = 0; i < variantCount; i++) {
    const variant = { items: [...items], configuration: { ...configuration } };

    switch (testType) {
      case 'titles':
        variant.items = items.map(item => ({
          ...item,
          title: generateTitleVariant(item.title, i)
        }));
        break;
      case 'timing':
        variant.configuration.displayDuration = (configuration.displayDuration || 6000) + (i * 1000);
        break;
      case 'format':
        variant.configuration.countdownDirection = i % 2 === 0 ? 'descending' : 'ascending';
        break;
    }

    variants.push({
      id: `variant_${i + 1}`,
      name: `Variant ${i + 1}`,
      changes: getVariantChanges(testType, i),
      ...variant
    });
  }

  return variants;
}

function generateTitleVariant(originalTitle: string, variantIndex: number): string {
  const variations = [
    originalTitle, // Original
    `Shocking ${originalTitle}`, // Add emotional trigger
    originalTitle.replace(/\b(\w+)\b/g, (match, word) =>
      ['Amazing', 'Incredible', 'Mind-Blowing'][variantIndex] || match
    ) // Replace with power words
  ];

  return variations[variantIndex] || originalTitle;
}

function getVariantChanges(testType: string, variantIndex: number): string[] {
  const changes = {
    titles: [
      'Original titles',
      'Added emotional triggers',
      'Enhanced with power words'
    ],
    timing: [
      'Original timing',
      'Extended duration (+1s)',
      'Extended duration (+2s)'
    ],
    format: [
      'Original format',
      'Countdown direction changed',
      'Transition style modified'
    ]
  };

  return [changes[testType as keyof typeof changes]?.[variantIndex] || 'Modified variant'];
}

function getABTestMetrics(testType: string): string[] {
  const metrics = {
    titles: ['Click-through rate', 'Engagement rate', 'Completion rate'],
    timing: ['Watch time', 'Retention rate', 'Drop-off points'],
    format: ['Engagement rate', 'Share rate', 'Comment rate']
  };

  return metrics[testType as keyof typeof metrics] || ['Engagement rate', 'Reach', 'Conversions'];
}

function getSuccessCriteria(testType: string): string[] {
  const criteria = {
    titles: ['20% improvement in CTR', '15% increase in engagement'],
    timing: ['10% increase in watch time', '5% improvement in retention'],
    format: ['25% increase in shares', '20% improvement in comments']
  };

  return criteria[testType as keyof typeof criteria] || ['Statistical significance', 'Business impact'];
}

function generateViralHooks(items: any[], audience: string, platform: string): any[] {
  return items.map((item, index) => ({
    itemIndex: index,
    originalTitle: item.title,
    hooks: [
      {
        type: 'curiosity',
        hook: `You won't believe what happens at #${index + 1}...`,
        reasoning: 'Creates curiosity gap that compels viewing'
      },
      {
        type: 'fomo',
        hook: `Everyone's talking about #${index + 1} but most people don't know...`,
        reasoning: 'Fear of missing out drives engagement'
      },
      {
        type: 'shock',
        hook: `#${index + 1} will completely change how you think about...`,
        reasoning: 'Promise of mind-changing information'
      }
    ],
    recommendation: 'Use curiosity hook for maximum retention'
  }));
}

function getPlatformBestPractices(platform: string): any {
  const practices = {
    tiktok: {
      content: {
        length: '15-60 seconds optimal',
        format: 'Vertical 9:16 aspect ratio',
        pacing: 'Fast-paced with quick cuts',
        audio: 'Use trending sounds and music'
      },
      engagement: {
        hooks: 'Capture attention in first 3 seconds',
        captions: 'Always include captions for accessibility',
        hashtags: '3-5 relevant hashtags',
        posting: 'Post during peak hours (6-10 PM)'
      },
      optimization: {
        algorithm: 'Prioritize completion rate and rewatches',
        trends: 'Stay current with trending challenges',
        community: 'Respond to comments quickly',
        consistency: 'Post daily for best results'
      }
    },
    instagram: {
      content: {
        format: 'Square 1:1 or vertical 4:5 for feed, 9:16 for Reels',
        quality: 'High-resolution visuals essential',
        length: '15-30 seconds for Reels',
        style: 'Consistent visual branding'
      },
      engagement: {
        captions: 'Write engaging captions with CTAs',
        hashtags: 'Use all 30 hashtags strategically',
        stories: 'Utilize Stories for additional reach',
        timing: 'Post during 6-9 PM for best engagement'
      }
    }
  };

  return practices[platform.toLowerCase() as keyof typeof practices] || {
    general: {
      content: 'High-quality, engaging content',
      timing: 'Post during peak audience hours',
      engagement: 'Respond promptly to comments',
      optimization: 'Monitor analytics and adjust strategy'
    }
  };
}

export default router;
