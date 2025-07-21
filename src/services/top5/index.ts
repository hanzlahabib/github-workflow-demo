// Top 5 Videos Services Export Module
// This module provides centralized access to all Top 5 video generation services

// Content Service - Content analysis and AI generation
export {
  ContentService,
  contentService,
  type ContentAnalysisRequest,
  type ContentItem,
  type ContentConfiguration,
  type ContentStyling,
  type ViralAnalysisResult,
  type AIListGenerationRequest,
  type AIListGenerationResult
} from './contentService';

// Trending Service - Trending topics analysis
export {
  TrendingService,
  trendingService,
  type TrendingTopic,
  type TrendingAnalysisRequest,
  type TrendingAnalysisResult
} from './trendingService';

// Performance Service - Performance prediction and competitor analysis
export {
  PerformanceService,
  performanceService,
  type PerformancePredictionRequest,
  type PlatformPrediction,
  type PerformancePredictionResult,
  type CompetitorAnalysisRequest,
  type CompetitorProfile,
  type CompetitorAnalysisResult
} from './performanceService';

// Template Service - Viral templates management
export {
  TemplateService,
  templateService,
  type ViralTemplate,
  type TemplateFilter,
  type TemplateCustomization,
  type CustomTemplateRequest
} from './templateService';

// Optimization Service - Content and performance optimization
export {
  OptimizationService,
  optimizationService,
  type OptimizationRequest,
  type OptimizationGoal,
  type OptimizationSuggestion,
  type OptimizationResult,
  type A11yOptimization,
  type SEOOptimization
} from './optimizationService';

// Re-export service instances for convenience
import { contentService } from './contentService';
import { trendingService } from './trendingService';
import { performanceService } from './performanceService';
import { templateService } from './templateService';
import { optimizationService } from './optimizationService';

// Combined service interface for easy access
export interface Top5Services {
  content: typeof contentService;
  trending: typeof trendingService;
  performance: typeof performanceService;
  template: typeof templateService;
  optimization: typeof optimizationService;
}

// Main service container
export const top5Services: Top5Services = {
  content: contentService,
  trending: trendingService,
  performance: performanceService,
  template: templateService,
  optimization: optimizationService
};

// Utility functions for common workflows
export class Top5WorkflowUtils {
  /**
   * Complete viral content analysis workflow
   */
  static async analyzeAndOptimizeContent(request: {
    items: any[];
    configuration: any;
    styling: any;
    targetPlatforms: string[];
    targetAudience?: string;
  }) {
    const { items, configuration, styling, targetPlatforms, targetAudience } = request;

    // Step 1: Analyze viral potential
    const viralAnalysis = contentService.analyzeViralPotential(items, configuration, styling);

    // Step 2: Predict performance across platforms
    const performancePrediction = await performanceService.predictPerformance({
      items,
      configuration,
      targetPlatforms
    });

    // Step 3: Generate optimization suggestions
    const optimizations = await optimizationService.generateOptimizations({
      items,
      configuration,
      styling,
      targetPlatforms,
      targetAudience
    });

    return {
      viralAnalysis,
      performancePrediction,
      optimizations,
      recommendations: this.generateCombinedRecommendations(
        viralAnalysis,
        performancePrediction,
        optimizations
      )
    };
  }

  /**
   * Get trending content suggestions for Top 5 lists
   */
  static async getTrendingContentSuggestions(category: string = 'general', platform: string = 'all') {
    const trendingAnalysis = await trendingService.analyzeTrendingTopics({
      category,
      platform,
      timeframe: '24h'
    });

    const contentSuggestions = trendingAnalysis.topics.slice(0, 5).map((topic, index) => ({
      id: `trending_${index + 1}`,
      rank: index + 1,
      title: topic.topic,
      description: `${topic.engagement} engagement - ${topic.sentiment} sentiment`,
      viralScore: topic.viralScore,
      contentTags: contentService.generateContentTags(topic.category, topic.topic)
    }));

    return {
      suggestions: contentSuggestions,
      trendingData: trendingAnalysis,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get recommended templates based on content analysis
   */
  static getRecommendedTemplatesForContent(
    items: any[],
    category: string,
    targetPlatforms: string[],
    viralScore: number
  ) {
    return templateService.getRecommendedTemplates(
      category,
      viralScore,
      targetPlatforms,
      'intermediate'
    );
  }

  /**
   * Complete competitor analysis and positioning
   */
  static async analyzeMarketPosition(topic: string, category: string, platforms: string[]) {
    const competitorAnalyses = await Promise.all(
      platforms.map(platform =>
        performanceService.analyzeCompetitors({ topic, category, platform })
      )
    );

    const combinedAnalysis = {
      platforms: platforms.map((platform, index) => ({
        platform,
        analysis: competitorAnalyses[index]
      })),
      overallOpportunities: this.extractCombinedOpportunities(competitorAnalyses),
      strategicRecommendations: this.generateStrategicRecommendations(competitorAnalyses, platforms)
    };

    return combinedAnalysis;
  }

  /**
   * Optimize posting schedule across all platforms
   */
  static optimizeMultiPlatformSchedule(platforms: string[], timezone: string = 'UTC') {
    const schedules = optimizationService.optimizePostingSchedule(platforms, timezone);
    const crossPlatformStrategy = this.generateCrossPlatformStrategy(schedules);

    return {
      individualSchedules: schedules,
      crossPlatformStrategy,
      timeline: this.createPostingTimeline(schedules)
    };
  }

  private static generateCombinedRecommendations(
    viralAnalysis: any,
    performance: any,
    optimizations: any
  ): string[] {
    const recommendations = [
      ...optimizations.suggestions.slice(0, 3).map((s: any) => s.suggestion),
      ...performance.recommendedStrategy.slice(0, 2),
      ...viralAnalysis.improvements.slice(0, 2)
    ];

    return [...new Set(recommendations)].slice(0, 8); // Remove duplicates and limit
  }

  private static extractCombinedOpportunities(analyses: any[]): string[] {
    const allOpportunities = analyses.flatMap(analysis => analysis.opportunities);
    const opportunityCounts = allOpportunities.reduce((counts, opp) => {
      counts[opp] = (counts[opp] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(opportunityCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([opp]) => opp);
  }

  private static generateStrategicRecommendations(analyses: any[], platforms: string[]): string[] {
    return [
      'Focus on underserved demographics across all platforms',
      'Develop platform-specific content variations',
      'Create series-based content for sustained engagement',
      'Leverage cross-platform synergies for maximum reach',
      'Monitor competitor activities and adapt quickly'
    ];
  }

  private static generateCrossPlatformStrategy(schedules: any[]): {
    primaryPlatform: string;
    sequence: { platform: string; delay: string; reason: string }[];
  } {
    const sortedByEngagement = [...schedules].sort((a, b) => {
      const engagementScores = { tiktok: 5, instagram: 4, youtube: 3, twitter: 2, facebook: 1 };
      return (engagementScores[b.platform.toLowerCase() as keyof typeof engagementScores] || 0) -
             (engagementScores[a.platform.toLowerCase() as keyof typeof engagementScores] || 0);
    });

    const primary = sortedByEngagement[0];
    const sequence = sortedByEngagement.slice(1).map((schedule, index) => ({
      platform: schedule.platform,
      delay: `${(index + 1) * 2} hours`,
      reason: `Allow momentum to build from ${index === 0 ? primary.platform : sortedByEngagement[index].platform}`
    }));

    return {
      primaryPlatform: primary.platform,
      sequence
    };
  }

  private static createPostingTimeline(schedules: any[]): {
    time: string;
    action: string;
    platform: string;
  }[] {
    // Create a simple timeline based on optimal posting times
    return schedules.map(schedule => ({
      time: schedule.optimalTime,
      action: 'Post content',
      platform: schedule.platform
    })).sort((a, b) => a.time.localeCompare(b.time));
  }
}

// Default export for convenience
export default top5Services;
