import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { templateService } from '../../services/top5/templateService';
import { isDevelopment } from '../../config';

const router = express.Router();

/**
 * @route GET /api/top5/templates/viral
 * @desc Get viral templates with filtering options
 * @access Private
 */
router.get('/viral', authMiddleware, async (req, res) => {
  try {
    const {
      category,
      difficulty,
      platform,
      isPremium,
      minViralScore,
      sortBy = 'viral',
      limit
    } = req.query;

    const filter = {
      category: category as string,
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      platform: platform as string,
      isPremium: isPremium === 'true' ? true : isPremium === 'false' ? false : undefined,
      minViralScore: minViralScore ? parseInt(minViralScore as string, 10) : undefined,
      sortBy: sortBy as 'viral' | 'engagement' | 'recent' | 'popularity'
    };

    let templates = templateService.getViralTemplates(filter);

    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        templates = templates.slice(0, limitNum);
      }
    }

    // Get template categories for additional context
    const categories = templateService.getTemplateCategories();

    res.json({
      success: true,
      data: {
        templates,
        categories: categories.map(cat => ({
          name: cat.category,
          count: cat.count,
          avgViralScore: cat.avgViralScore
        })),
        filters: filter,
        totalResults: templates.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error getting viral templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load viral templates',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/templates/:templateId
 * @desc Get specific template by ID
 * @access Private
 */
router.get('/:templateId', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      });
    }

    const template = templateService.getTemplateById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Get analytics for this template
    const analytics = templateService.getTemplateAnalytics(templateId);

    res.json({
      success: true,
      data: {
        template,
        analytics,
        retrievedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error getting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load template',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/templates/recommendations
 * @desc Get recommended templates based on content
 * @access Private
 */
router.post('/recommendations', authMiddleware, async (req, res) => {
  try {
    const {
      category,
      viralScore = 75,
      targetPlatforms = ['tiktok'],
      difficulty = 'intermediate',
      contentItems = []
    } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Target platforms must be a non-empty array'
      });
    }

    const recommendedTemplates = templateService.getRecommendedTemplates(
      category,
      viralScore,
      targetPlatforms,
      difficulty
    );

    // Calculate match scores for each template
    const templatesWithScores = recommendedTemplates.map(template => ({
      ...template,
      matchReasons: getMatchReasons(template, category, targetPlatforms, viralScore),
      compatibilityScore: calculateCompatibilityScore(template, targetPlatforms, viralScore)
    }));

    res.json({
      success: true,
      data: {
        recommendations: templatesWithScores,
        criteria: {
          category,
          viralScore,
          targetPlatforms,
          difficulty
        },
        totalRecommendations: templatesWithScores.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template recommendations',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/templates/customize
 * @desc Customize a template with user preferences
 * @access Private
 */
router.post('/customize', authMiddleware, async (req, res) => {
  try {
    const {
      templateId,
      colorScheme,
      fontFamily,
      countdownSpeed,
      backgroundImage,
      musicTrack,
      customAnimations
    } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      });
    }

    const customization = {
      templateId,
      colorScheme,
      fontFamily,
      countdownSpeed,
      backgroundImage,
      musicTrack,
      customAnimations
    };

    const customizedTemplate = templateService.customizeTemplate(templateId, customization);

    if (!customizedTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or customization failed'
      });
    }

    res.json({
      success: true,
      data: {
        customizedTemplate,
        originalTemplateId: templateId,
        appliedCustomizations: Object.keys(customization).filter(key =>
          customization[key as keyof typeof customization] !== undefined
        ),
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error customizing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to customize template',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/templates/create
 * @desc Create a new custom template
 * @access Private
 */
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      category,
      baseTemplate,
      styling,
      configuration
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name and category are required'
      });
    }

    if (!styling || !configuration) {
      return res.status(400).json({
        success: false,
        error: 'Styling and configuration objects are required'
      });
    }

    const customTemplateRequest = {
      name,
      category,
      baseTemplate,
      styling,
      configuration
    };

    const newTemplate = templateService.createCustomTemplate(customTemplateRequest);

    res.status(201).json({
      success: true,
      data: {
        template: newTemplate,
        message: 'Custom template created successfully',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error creating custom template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom template',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/templates/categories/stats
 * @desc Get template categories with statistics
 * @access Private
 */
router.get('/categories/stats', authMiddleware, async (req, res) => {
  try {
    const categories = templateService.getTemplateCategories();

    // Add additional statistics
    const enhancedCategories = categories.map(category => ({
      ...category,
      popularityRating: calculatePopularityRating(category.avgViralScore, category.count),
      recommendedFor: getRecommendedAudience(category.category),
      topPlatforms: getTopPlatformsForCategory(category.category)
    }));

    const totalTemplates = categories.reduce((sum, cat) => sum + cat.count, 0);
    const avgScore = Math.round(
      categories.reduce((sum, cat) => sum + (cat.avgViralScore * cat.count), 0) / totalTemplates
    );

    res.json({
      success: true,
      data: {
        categories: enhancedCategories,
        statistics: {
          totalCategories: categories.length,
          totalTemplates,
          avgViralScore: avgScore,
          mostPopularCategory: categories.reduce((max, cat) =>
            cat.count > max.count ? cat : max
          ),
          highestScoringCategory: categories.reduce((max, cat) =>
            cat.avgViralScore > max.avgViralScore ? cat : max
          )
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error getting category stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get category statistics',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/templates/search
 * @desc Search templates by keyword
 * @access Private
 */
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const {
      q: query,
      category,
      difficulty,
      platform,
      isPremium,
      minViralScore,
      sortBy = 'viral'
    } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required and must be non-empty'
      });
    }

    const filters = {
      category: category as string,
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      platform: platform as string,
      isPremium: isPremium === 'true' ? true : isPremium === 'false' ? false : undefined,
      minViralScore: minViralScore ? parseInt(minViralScore as string, 10) : undefined,
      sortBy: sortBy as 'viral' | 'engagement' | 'recent' | 'popularity'
    };

    const searchResults = templateService.searchTemplates(query.trim(), filters);

    // Add search relevance scoring
    const resultsWithRelevance = searchResults.map(template => ({
      ...template,
      relevanceScore: calculateSearchRelevance(template, query.trim()),
      matchedFields: getMatchedFields(template, query.trim())
    }));

    // Sort by relevance if no specific sort order
    if (sortBy === 'viral') {
      resultsWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    res.json({
      success: true,
      data: {
        results: resultsWithRelevance,
        query: query.trim(),
        filters,
        totalResults: resultsWithRelevance.length,
        searchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error searching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search templates',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/templates/:templateId/analytics
 * @desc Get detailed analytics for a template
 * @access Private
 */
router.get('/:templateId/analytics', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      });
    }

    const analytics = templateService.getTemplateAnalytics(templateId);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: 'Template not found or no analytics available'
      });
    }

    // Add additional insights
    const enhancedAnalytics = {
      ...analytics,
      insights: {
        performanceRating: getPerformanceRating(analytics.performance.successRate),
        popularityTrend: getPopularityTrend(analytics.trends.monthlyUsage),
        competitorComparison: getCompetitorComparison(analytics.performance.avgViralScore),
        recommendations: getAnalyticsRecommendations(analytics)
      }
    };

    res.json({
      success: true,
      data: {
        templateId,
        analytics: enhancedAnalytics,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Templates] Error getting template analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template analytics',
      details: isDevelopment() ? error : undefined
    });
  }
});

// Helper methods
function getMatchReasons(template: any, category: string, platforms: string[], viralScore: number): string[] {
  const reasons: string[] = [];

  if (template.category === category) {
    reasons.push(`Perfect match for ${category} content`);
  }

  if (template.viralScore >= viralScore) {
    reasons.push(`High viral potential (${template.viralScore}/100)`);
  }

  const platformMatches = platforms.filter(platform =>
    template.platforms.some((p: string) => p.toLowerCase() === platform.toLowerCase())
  );

  if (platformMatches.length > 0) {
    reasons.push(`Optimized for ${platformMatches.join(', ')}`);
  }

  if (template.metadata.successRate > 85) {
    reasons.push('Proven high success rate');
  }

  if (template.metadata.usage > 10000) {
    reasons.push('Popular choice among creators');
  }

  return reasons;
}

function calculateCompatibilityScore(template: any, platforms: string[], viralScore: number): number {
  let score = 0;

  // Platform compatibility (40% weight)
  const platformMatches = platforms.filter(platform =>
    template.platforms.some((p: string) => p.toLowerCase() === platform.toLowerCase())
  );
  score += (platformMatches.length / platforms.length) * 40;

  // Viral score compatibility (30% weight)
  const scoreDiff = Math.abs(template.viralScore - viralScore);
  const scoreCompatibility = Math.max(0, (100 - scoreDiff) / 100);
  score += scoreCompatibility * 30;

  // Success rate (20% weight)
  score += (template.metadata.successRate / 100) * 20;

  // Usage popularity (10% weight)
  const popularityScore = Math.min(template.metadata.usage / 20000, 1);
  score += popularityScore * 10;

  return Math.round(score);
}

function calculatePopularityRating(avgViralScore: number, count: number): 'low' | 'medium' | 'high' | 'very high' {
  const popularityScore = (avgViralScore * 0.7) + (Math.min(count / 10, 10) * 3);

  if (popularityScore >= 85) return 'very high';
  if (popularityScore >= 70) return 'high';
  if (popularityScore >= 55) return 'medium';
  return 'low';
}

function getRecommendedAudience(category: string): string {
  const audiences = {
    entertainment: 'Gen Z & Millennials',
    gaming: 'Gamers & Tech Enthusiasts',
    lifestyle: 'Lifestyle Enthusiasts',
    technology: 'Tech-Savvy Users',
    sports: 'Sports Fans',
    music: 'Music Lovers'
  };

  return audiences[category as keyof typeof audiences] || 'General Audience';
}

function getTopPlatformsForCategory(category: string): string[] {
  const platformsByCategory = {
    entertainment: ['TikTok', 'Instagram', 'YouTube'],
    gaming: ['TikTok', 'YouTube', 'Twitch'],
    lifestyle: ['Instagram', 'YouTube', 'Pinterest'],
    technology: ['YouTube', 'LinkedIn', 'Twitter'],
    sports: ['TikTok', 'Instagram', 'YouTube'],
    music: ['TikTok', 'Instagram', 'Spotify']
  };

  return platformsByCategory[category as keyof typeof platformsByCategory] || ['TikTok', 'Instagram', 'YouTube'];
}

function calculateSearchRelevance(template: any, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Name match (highest weight)
  if (template.name.toLowerCase().includes(queryLower)) {
    score += 50;
  }

  // Description match
  if (template.description.toLowerCase().includes(queryLower)) {
    score += 30;
  }

  // Tags match
  const tagMatches = template.tags.filter((tag: string) =>
    tag.toLowerCase().includes(queryLower)
  ).length;
  score += tagMatches * 10;

  // Features match
  const featureMatches = template.features.filter((feature: string) =>
    feature.toLowerCase().includes(queryLower)
  ).length;
  score += featureMatches * 5;

  // Category match
  if (template.category.toLowerCase().includes(queryLower)) {
    score += 20;
  }

  return score;
}

function getMatchedFields(template: any, query: string): string[] {
  const queryLower = query.toLowerCase();
  const matchedFields: string[] = [];

  if (template.name.toLowerCase().includes(queryLower)) {
    matchedFields.push('name');
  }

  if (template.description.toLowerCase().includes(queryLower)) {
    matchedFields.push('description');
  }

  if (template.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
    matchedFields.push('tags');
  }

  if (template.features.some((feature: string) => feature.toLowerCase().includes(queryLower))) {
    matchedFields.push('features');
  }

  if (template.category.toLowerCase().includes(queryLower)) {
    matchedFields.push('category');
  }

  return matchedFields;
}

function getPerformanceRating(successRate: number): 'poor' | 'fair' | 'good' | 'excellent' {
  if (successRate >= 90) return 'excellent';
  if (successRate >= 80) return 'good';
  if (successRate >= 70) return 'fair';
  return 'poor';
}

function getPopularityTrend(monthlyUsage: any[]): 'declining' | 'stable' | 'growing' | 'surging' {
  if (monthlyUsage.length < 2) return 'stable';

  const recent = monthlyUsage.slice(-3);
  const older = monthlyUsage.slice(0, 3);

  const recentAvg = recent.reduce((sum, month) => sum + month.usage, 0) / recent.length;
  const olderAvg = older.reduce((sum, month) => sum + month.usage, 0) / older.length;

  const growth = (recentAvg - olderAvg) / olderAvg;

  if (growth > 0.5) return 'surging';
  if (growth > 0.1) return 'growing';
  if (growth > -0.1) return 'stable';
  return 'declining';
}

function getCompetitorComparison(avgViralScore: number): string {
  if (avgViralScore >= 90) return 'Top 10% performer';
  if (avgViralScore >= 80) return 'Above average';
  if (avgViralScore >= 70) return 'Average performer';
  return 'Below average';
}

function getAnalyticsRecommendations(analytics: any): string[] {
  const recommendations: string[] = [];

  if (analytics.performance.successRate < 80) {
    recommendations.push('Consider updating template with current trends');
  }

  if (analytics.performance.totalUsage < 5000) {
    recommendations.push('Increase promotion and visibility');
  }

  const trend = getPopularityTrend(analytics.trends.monthlyUsage);
  if (trend === 'declining') {
    recommendations.push('Refresh template design to reverse declining trend');
  }

  if (analytics.performance.avgViralScore < 85) {
    recommendations.push('Optimize for better viral potential');
  }

  if (recommendations.length === 0) {
    recommendations.push('Template is performing well, maintain current strategy');
  }

  return recommendations;
}

export default router;
