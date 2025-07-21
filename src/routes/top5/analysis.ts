import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { contentService } from '../../services/top5/contentService';
import { isDevelopment } from '../../config';

const router = express.Router();

/**
 * @route POST /api/top5/analysis/viral-potential
 * @desc Analyze viral potential of Top 5 content
 * @access Private
 */
router.post('/viral-potential', authMiddleware, async (req, res) => {
  try {
    const { items, configuration, styling } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    if (!configuration) {
      return res.status(400).json({
        success: false,
        error: 'Configuration object is required'
      });
    }

    const viralAnalysis = contentService.analyzeViralPotential(items, configuration, styling || {});

    res.json({
      success: true,
      data: {
        analysis: viralAnalysis,
        analyzedAt: new Date().toISOString(),
        itemsAnalyzed: items.length,
        summary: {
          viralScore: viralAnalysis.overallScore,
          topStrengths: viralAnalysis.strengths.slice(0, 3),
          topImprovements: viralAnalysis.improvements.slice(0, 3),
          targetAudience: viralAnalysis.targetAudience,
          recommendedPlatforms: viralAnalysis.platformRecommendations.slice(0, 3)
        }
      }
    });
  } catch (error) {
    console.error('[Top5 Analysis] Error analyzing viral potential:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze viral potential',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/analysis/generate-ai-list
 * @desc Generate AI-powered Top 5 list
 * @access Private
 */
router.post('/generate-ai-list', authMiddleware, async (req, res) => {
  try {
    const {
      topic,
      category,
      targetAudience,
      viralFactor = 75,
      platform = 'tiktok',
      itemCount = 5
    } = req.body;

    if (!topic || !category) {
      return res.status(400).json({
        success: false,
        error: 'Topic and category are required'
      });
    }

    if (itemCount < 3 || itemCount > 10) {
      return res.status(400).json({
        success: false,
        error: 'Item count must be between 3 and 10'
      });
    }

    const generatedList = await contentService.generateAITop5List({
      topic,
      category,
      targetAudience: targetAudience || 'Young Adults (18-29)',
      viralFactor,
      platform,
      itemCount
    });

    res.json({
      success: true,
      data: generatedList
    });
  } catch (error) {
    console.error('[Top5 Analysis] Error generating AI list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI list',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/analysis/content-tags
 * @desc Generate content tags for Top 5 content
 * @access Private
 */
router.post('/content-tags', authMiddleware, async (req, res) => {
  try {
    const { category, topic, customKeywords = [] } = req.body;

    if (!category || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Category and topic are required'
      });
    }

    const baseTags = contentService.generateContentTags(category, topic);

    // Add custom keywords if provided
    const allTags = [...baseTags];
    if (Array.isArray(customKeywords)) {
      allTags.push(...customKeywords.filter(keyword =>
        typeof keyword === 'string' && keyword.length > 0
      ));
    }

    // Remove duplicates and limit to 15 tags
    const uniqueTags = [...new Set(allTags)].slice(0, 15);

    res.json({
      success: true,
      data: {
        tags: uniqueTags,
        category,
        topic,
        baseTags: baseTags.length,
        customTags: customKeywords.length,
        totalTags: uniqueTags.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Analysis] Error generating content tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate content tags',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/analysis/title-optimization
 * @desc Analyze and optimize titles for viral potential
 * @access Private
 */
router.post('/title-optimization', authMiddleware, async (req, res) => {
  try {
    const { titles, targetPlatform = 'all', targetAudience } = req.body;

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Titles array is required and must not be empty'
      });
    }

    const analysisResults = titles.map((title, index) => {
      const analysis = analyzeTitleViralFactors(title);
      const optimizedTitle = optimizeTitleForVirality(title, targetPlatform);

      return {
        index,
        original: title,
        optimized: optimizedTitle,
        analysis,
        improvements: getTitleImprovements(analysis),
        viralScore: calculateTitleViralScore(analysis)
      };
    });

    const overallStats = {
      totalTitles: titles.length,
      avgOriginalScore: Math.round(
        analysisResults.reduce((sum, result) => sum + result.viralScore.original, 0) / titles.length
      ),
      avgOptimizedScore: Math.round(
        analysisResults.reduce((sum, result) => sum + result.viralScore.optimized, 0) / titles.length
      ),
      totalImprovement: 0
    };

    overallStats.totalImprovement = overallStats.avgOptimizedScore - overallStats.avgOriginalScore;

    res.json({
      success: true,
      data: {
        results: analysisResults,
        statistics: overallStats,
        targetPlatform,
        targetAudience,
        analyzedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Analysis] Error optimizing titles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize titles',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/analysis/content-health-check
 * @desc Perform comprehensive content health analysis
 * @access Private
 */
router.post('/content-health-check', authMiddleware, async (req, res) => {
  try {
    const { items, configuration, styling, targetPlatforms = ['tiktok'] } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    // Perform viral analysis
    const viralAnalysis = contentService.analyzeViralPotential(
      items,
      configuration || {},
      styling || {}
    );

    // Content health metrics
    const healthMetrics = {
      titleQuality: assessTitleQuality(items),
      contentLength: assessContentLength(items),
      emotionalImpact: assessEmotionalImpact(items),
      specificity: assessSpecificity(items),
      readability: assessReadability(items),
      platformReadiness: assessPlatformReadiness(items, targetPlatforms)
    };

    // Overall health score (0-100)
    const overallHealth = Math.round(
      Object.values(healthMetrics).reduce((sum: number, metric: any) => sum + metric.score, 0) /
      Object.keys(healthMetrics).length
    );

    // Generate recommendations
    const recommendations = generateHealthRecommendations(healthMetrics, viralAnalysis);

    res.json({
      success: true,
      data: {
        overallHealth,
        viralScore: viralAnalysis.overallScore,
        healthMetrics,
        viralAnalysis: {
          strengths: viralAnalysis.strengths,
          improvements: viralAnalysis.improvements,
          targetAudience: viralAnalysis.targetAudience
        },
        recommendations,
        checkedAt: new Date().toISOString(),
        itemsAnalyzed: items.length
      }
    });
  } catch (error) {
    console.error('[Top5 Analysis] Error in content health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform content health check',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/analysis/audience-match
 * @desc Analyze how well content matches target audience
 * @access Private
 */
router.post('/audience-match', authMiddleware, async (req, res) => {
  try {
    const { items, targetAudience, demographics } = req.body;

    if (!items || !targetAudience) {
      return res.status(400).json({
        success: false,
        error: 'Items and target audience are required'
      });
    }

    const audienceAnalysis = analyzeAudienceMatch(items, targetAudience, demographics);

    res.json({
      success: true,
      data: {
        ...audienceAnalysis,
        analyzedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Analysis] Error analyzing audience match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze audience match',
      details: isDevelopment() ? error : undefined
    });
  }
});

// Helper methods
function analyzeTitleViralFactors(title: string) {
  return {
    length: title.length,
    hasNumbers: /\d/.test(title),
    hasEmotionalWords: /amazing|incredible|shocking|unbelievable|stunning|mind-blowing/i.test(title),
    hasActionWords: /breaking|revealed|exposed|discovered|ultimate|secret/i.test(title),
    hasSuperlatives: /best|worst|most|least|biggest|smallest|top|bottom/i.test(title),
    hasUrgency: /now|today|urgent|limited|exclusive|breaking|new/i.test(title),
    hasPowerWords: /powerful|legendary|epic|genius|masterpiece|breakthrough/i.test(title),
    wordCount: title.split(/\s+/).length
  };
}

function optimizeTitleForVirality(title: string, platform: string): string {
  let optimized = title;

  // Add emotional trigger if missing
  if (!/amazing|incredible|shocking|unbelievable|stunning/i.test(optimized)) {
    const triggers = ['Shocking', 'Incredible', 'Amazing', 'Mind-Blowing'];
    const trigger = triggers[Math.floor(Math.random() * triggers.length)];
    optimized = `${trigger} ${optimized}`;
  }

  // Add urgency if missing
  if (!/now|today|urgent|breaking|new|exclusive/i.test(optimized) && Math.random() > 0.5) {
    optimized = optimized.replace(/\b(facts?|truths?|secrets?)\b/i, '$1 You Need to Know Now');
  }

  // Platform-specific optimizations
  const maxLengths = {
    tiktok: 40,
    instagram: 125,
    youtube: 70,
    twitter: 50
  };

  const maxLength = maxLengths[platform.toLowerCase() as keyof typeof maxLengths] || 60;
  if (optimized.length > maxLength) {
    optimized = optimized.substring(0, maxLength - 3) + '...';
  }

  return optimized;
}

function getTitleImprovements(analysis: any): string[] {
  const improvements: string[] = [];

  if (analysis.length < 20) improvements.push('Make title longer (20-60 characters optimal)');
  if (analysis.length > 60) improvements.push('Shorten title for better readability');
  if (!analysis.hasEmotionalWords) improvements.push('Add emotional triggers (shocking, amazing)');
  if (!analysis.hasNumbers) improvements.push('Include specific numbers or statistics');
  if (!analysis.hasSuperlatives) improvements.push('Use superlatives (best, most, top)');
  if (!analysis.hasUrgency) improvements.push('Add urgency words (now, breaking, exclusive)');

  return improvements;
}

function calculateTitleViralScore(analysis: any): { original: number; optimized: number } {
  let score = 30; // Base score

  if (analysis.length >= 20 && analysis.length <= 60) score += 15;
  if (analysis.hasNumbers) score += 10;
  if (analysis.hasEmotionalWords) score += 20;
  if (analysis.hasActionWords) score += 10;
  if (analysis.hasSuperlatives) score += 12;
  if (analysis.hasUrgency) score += 15;
  if (analysis.hasPowerWords) score += 8;

  const original = Math.min(score, 100);
  const optimized = Math.min(original + 15, 100); // Assume 15-point improvement

  return { original, optimized };
}

function assessTitleQuality(items: any[]): { score: number; issues: string[]; strengths: string[] } {
  const issues: string[] = [];
  const strengths: string[] = [];
  let score = 70;

  const avgLength = items.reduce((sum, item) => sum + item.title.length, 0) / items.length;
  const shortTitles = items.filter(item => item.title.length < 20).length;
  const longTitles = items.filter(item => item.title.length > 80).length;
  const emotionalTitles = items.filter(item =>
    /amazing|incredible|shocking|unbelievable/i.test(item.title)
  ).length;

  if (avgLength < 20) {
    issues.push('Titles are too short on average');
    score -= 15;
  } else if (avgLength >= 20 && avgLength <= 60) {
    strengths.push('Good average title length');
    score += 10;
  }

  if (shortTitles > items.length * 0.3) {
    issues.push('Too many short titles');
    score -= 10;
  }

  if (longTitles > items.length * 0.2) {
    issues.push('Some titles are too long');
    score -= 5;
  }

  if (emotionalTitles >= items.length * 0.6) {
    strengths.push('Good use of emotional triggers');
    score += 15;
  } else {
    issues.push('Need more emotional triggers in titles');
    score -= 10;
  }

  return { score: Math.max(Math.min(score, 100), 0), issues, strengths };
}

function assessContentLength(items: any[]): { score: number; analysis: string } {
  const avgDescLength = items.reduce((sum, item) =>
    sum + (item.description?.length || 0), 0
  ) / items.length;

  let score = 70;
  let analysis = '';

  if (avgDescLength === 0) {
    score = 30;
    analysis = 'No descriptions provided - missing content depth';
  } else if (avgDescLength < 50) {
    score = 50;
    analysis = 'Descriptions too short - need more detail';
  } else if (avgDescLength >= 50 && avgDescLength <= 200) {
    score = 90;
    analysis = 'Optimal description length for engagement';
  } else {
    score = 70;
    analysis = 'Descriptions might be too long for quick consumption';
  }

  return { score, analysis };
}

function assessEmotionalImpact(items: any[]): { score: number; breakdown: any } {
  const emotionalWords = /amazing|incredible|shocking|unbelievable|stunning|mind-blowing|insane|crazy|wild|epic/i;
  const itemsWithEmotion = items.filter(item => emotionalWords.test(item.title)).length;
  const emotionPercentage = (itemsWithEmotion / items.length) * 100;

  const score = Math.min(emotionPercentage * 1.2, 100);

  return {
    score: Math.round(score),
    breakdown: {
      itemsWithEmotion,
      totalItems: items.length,
      percentage: Math.round(emotionPercentage),
      recommendation: emotionPercentage < 60 ? 'Add more emotional triggers' : 'Good emotional engagement'
    }
  };
}

function assessSpecificity(items: any[]): { score: number; details: any } {
  const numbersPattern = /\d+/;
  const specificItems = items.filter(item =>
    numbersPattern.test(item.title) || numbersPattern.test(item.description || '')
  ).length;

  const specificityPercentage = (specificItems / items.length) * 100;
  const score = Math.min(specificityPercentage * 1.5, 100);

  return {
    score: Math.round(score),
    details: {
      itemsWithNumbers: specificItems,
      totalItems: items.length,
      percentage: Math.round(specificityPercentage),
      recommendation: specificityPercentage < 50 ? 'Add more specific data and numbers' : 'Good specificity'
    }
  };
}

function assessReadability(items: any[]): { score: number; analysis: string } {
  // Simple readability assessment
  const avgWordsPerTitle = items.reduce((sum, item) =>
    sum + item.title.split(/\s+/).length, 0
  ) / items.length;

  let score = 70;
  let analysis = '';

  if (avgWordsPerTitle < 3) {
    score = 40;
    analysis = 'Titles too short - need more context';
  } else if (avgWordsPerTitle >= 3 && avgWordsPerTitle <= 8) {
    score = 90;
    analysis = 'Optimal title length for readability';
  } else if (avgWordsPerTitle <= 12) {
    score = 75;
    analysis = 'Slightly long but acceptable';
  } else {
    score = 50;
    analysis = 'Titles too long - may lose attention';
  }

  return { score, analysis };
}

function assessPlatformReadiness(items: any[], platforms: string[]): { score: number; platformAnalysis: any[] } {
  const platformAnalysis = platforms.map(platform => {
    const maxTitleLength = {
      tiktok: 40,
      instagram: 125,
      youtube: 70,
      twitter: 50
    }[platform.toLowerCase()] || 60;

    const suitableItems = items.filter(item => item.title.length <= maxTitleLength).length;
    const suitabilityPercentage = (suitableItems / items.length) * 100;

    return {
      platform,
      suitableItems,
      totalItems: items.length,
      suitabilityPercentage: Math.round(suitabilityPercentage),
      maxTitleLength,
      ready: suitabilityPercentage >= 80
    };
  });

  const avgSuitability = platformAnalysis.reduce((sum, analysis) =>
    sum + analysis.suitabilityPercentage, 0
  ) / platforms.length;

  return {
    score: Math.round(avgSuitability),
    platformAnalysis
  };
}

function generateHealthRecommendations(healthMetrics: any, viralAnalysis: any): string[] {
  const recommendations: string[] = [];

  if (healthMetrics.titleQuality.score < 70) {
    recommendations.push('Improve title quality with emotional triggers and optimal length');
  }

  if (healthMetrics.emotionalImpact.score < 60) {
    recommendations.push('Add more emotional words to increase engagement');
  }

  if (healthMetrics.specificity.score < 50) {
    recommendations.push('Include specific numbers, dates, and statistics');
  }

  if (healthMetrics.readability.score < 70) {
    recommendations.push('Optimize title length for better readability');
  }

  if (healthMetrics.platformReadiness.score < 80) {
    recommendations.push('Adjust content length for better platform compatibility');
  }

  if (viralAnalysis.overallScore < 75) {
    recommendations.push('Focus on viral optimization techniques');
  }

  // Add generic recommendations if none specific
  if (recommendations.length === 0) {
    recommendations.push('Content looks good! Consider A/B testing different variations');
  }

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

function analyzeAudienceMatch(items: any[], targetAudience: string, demographics: any): any {
  // Mock audience analysis - in real implementation, this would be more sophisticated
  const ageGroups = {
    'Gen Z (13-24)': ['trendy', 'viral', 'meme', 'tiktok', 'snap', 'fire', 'slay'],
    'Millennials (25-34)': ['nostalgic', '90s', '2000s', 'throwback', 'memories', 'classic'],
    'Gen X (35-54)': ['authentic', 'real', 'genuine', 'practical', 'experience'],
    'Boomers (55+)': ['traditional', 'family', 'values', 'classic', 'timeless']
  };

  const audienceKeywords = ageGroups[targetAudience as keyof typeof ageGroups] || [];

  let matchScore = 50;
  const matchingItems = items.filter(item =>
    audienceKeywords.some(keyword =>
      item.title.toLowerCase().includes(keyword) ||
      (item.description && item.description.toLowerCase().includes(keyword))
    )
  );

  matchScore += (matchingItems.length / items.length) * 30;

  return {
    matchScore: Math.round(matchScore),
    targetAudience,
    matchingItems: matchingItems.length,
    totalItems: items.length,
    matchPercentage: Math.round((matchingItems.length / items.length) * 100),
    recommendations: [
      `Optimize content for ${targetAudience} preferences`,
      'Use age-appropriate language and references',
      'Consider platform preferences of target audience',
      'Test content with target demographic'
    ]
  };
}

export default router;
