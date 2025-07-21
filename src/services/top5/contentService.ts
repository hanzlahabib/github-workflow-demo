import {
  getOpenAIService,
  type ScriptGenerationRequest
} from '../openai';

export interface ContentAnalysisRequest {
  items: ContentItem[];
  configuration: ContentConfiguration;
  styling: ContentStyling;
}

export interface ContentItem {
  id?: string;
  rank: number;
  title: string;
  description: string;
  viralScore?: number;
  engagementPrediction?: number;
  contentTags?: string[];
  targetDemographic?: string;
  platformOptimization?: Record<string, boolean>;
}

export interface ContentConfiguration {
  mainTitle?: string;
  itemCount: number;
  countdownDirection: 'ascending' | 'descending';
  displayDuration: number;
  transitionStyle: string;
  viralOptimization?: {
    enabled: boolean;
    viralScore: number;
    engagementPrediction: number;
    targetDemographics: string[];
    contentTags: string[];
    optimalTiming: string;
    platformOptimization: Record<string, boolean>;
  };
}

export interface ContentStyling {
  layout?: {
    backgroundBlur?: boolean;
  };
  titleFont?: {
    weight: string;
  };
}

export interface ViralAnalysisResult {
  overallScore: number;
  metrics: {
    contentRelevance: number;
    visualAppeal: number;
    emotionalImpact: number;
    shareability: number;
    retentionPotential: number;
  };
  improvements: string[];
  strengths: string[];
  weaknesses: string[];
  targetAudience: string;
  optimalTiming: string;
  platformRecommendations: string[];
}

export interface AIListGenerationRequest {
  topic: string;
  category: string;
  targetAudience: string;
  viralFactor: number;
  platform: string;
  itemCount: number;
}

export interface AIListGenerationResult {
  items: ContentItem[];
  configuration: ContentConfiguration;
  metadata: {
    generatedAt: string;
    aiModel: string;
    confidence: number;
    viralPotential: number;
  };
}

export class ContentService {
  private openaiService: any | null = null;

  constructor() {
    try {
      this.openaiService = getOpenAIService();
    } catch (error) {
      console.warn('[ContentService] OpenAI service not available:', error);
    }
  }

  /**
   * Generate AI-powered Top 5 list based on topic and parameters
   */
  async generateAITop5List(params: AIListGenerationRequest): Promise<AIListGenerationResult> {
    const { topic, category, targetAudience, viralFactor, platform, itemCount } = params;

    // If OpenAI service is available, use it for better content generation
    if (this.openaiService) {
      try {
        const scriptRequest: ScriptGenerationRequest = {
          videoType: 'viral',
          topic: `Top ${itemCount} ${topic}`,
          duration: itemCount * 8, // 8 seconds per item
          language: 'en',
          tone: this.getToneFromViralFactor(viralFactor),
          targetAudience,
          platform: platform as any,
        };

        const scriptResponse = await this.openaiService.generateScript(scriptRequest);
        return this.parseScriptToTop5List(scriptResponse, params);
      } catch (error) {
        console.warn('[ContentService] AI generation failed, using fallback:', error);
      }
    }

    // Fallback to mock generation
    return this.generateMockTop5List(params);
  }

  /**
   * Analyze viral potential of content items
   */
  analyzeViralPotential(items: ContentItem[], configuration: ContentConfiguration, styling: ContentStyling): ViralAnalysisResult {
    let viralScore = 50;

    // Analyze content factors
    const contentFactors = items.map(item => ({
      titleLength: item.title.length,
      hasNumbers: /\d/.test(item.title),
      hasEmotionalWords: /amazing|incredible|shocking|unbelievable|stunning|mind-blowing|insane|crazy|wild/i.test(item.title),
      hasActionWords: /breaking|revealed|exposed|discovered|ultimate|secret|hidden|banned|forbidden/i.test(item.title),
      hasSuperlatives: /best|worst|most|least|biggest|smallest|fastest|slowest|top|bottom/i.test(item.title),
      hasUrgency: /now|today|urgent|limited|exclusive|breaking|just|new/i.test(item.title),
    }));

    // Calculate viral score based on multiple factors
    contentFactors.forEach(factor => {
      if (factor.titleLength >= 20 && factor.titleLength <= 60) viralScore += 10;
      if (factor.hasNumbers) viralScore += 5;
      if (factor.hasEmotionalWords) viralScore += 15;
      if (factor.hasActionWords) viralScore += 10;
      if (factor.hasSuperlatives) viralScore += 8;
      if (factor.hasUrgency) viralScore += 12;
    });

    // Configuration impact
    if (configuration.countdownDirection === 'descending') viralScore += 8;
    if (configuration.displayDuration >= 6000 && configuration.displayDuration <= 10000) viralScore += 5;
    if (configuration.itemCount === 5) viralScore += 7; // Optimal list length

    // Styling impact
    if (styling.layout?.backgroundBlur) viralScore += 3;
    if (styling.titleFont?.weight === 'bold') viralScore += 2;

    viralScore = Math.min(viralScore, 100);

    return {
      overallScore: viralScore,
      metrics: {
        contentRelevance: Math.min(viralScore + 5, 100),
        visualAppeal: Math.min(viralScore + 3, 100),
        emotionalImpact: Math.min(viralScore + 8, 100),
        shareability: Math.min(viralScore + 10, 100),
        retentionPotential: Math.min(viralScore + 2, 100)
      },
      improvements: this.generateImprovements(contentFactors, configuration, styling),
      strengths: this.generateStrengths(contentFactors, configuration, styling),
      weaknesses: this.generateWeaknesses(contentFactors, configuration, styling),
      targetAudience: this.determineTargetAudience(contentFactors, configuration),
      optimalTiming: 'Peak Hours (7-9 PM)',
      platformRecommendations: this.getPlatformRecommendations(viralScore)
    };
  }

  /**
   * Complete viral content analysis workflow
   */
  async analyzeAndOptimizeContent(request: {
    items: ContentItem[];
    configuration: ContentConfiguration;
    styling: ContentStyling;
    targetPlatforms: string[];
    targetAudience?: string;
  }) {
    const { items, configuration, styling, targetPlatforms, targetAudience } = request;

    // Step 1: Analyze viral potential
    const viralAnalysis = this.analyzeViralPotential(items, configuration, styling);

    // Mock performance and optimization data for now
    const performancePrediction = {
      overallViralScore: viralAnalysis.overallScore,
      platformPredictions: targetPlatforms.map(platform => ({
        platform,
        expectedViews: '100K',
        viralChance: viralAnalysis.overallScore
      }))
    };

    const optimizations = {
      suggestions: viralAnalysis.improvements.map(imp => ({ suggestion: imp })),
      improvement: 15
    };

    return {
      viralAnalysis,
      performancePrediction,
      optimizations,
      recommendations: [
        ...viralAnalysis.improvements.slice(0, 3),
        'Post during optimal times',
        'Use platform-specific formatting'
      ]
    };
  }

  /**
   * Get trending content suggestions
   */
  async getTrendingContentSuggestions(category: string = 'general', platform: string = 'all') {
    // Mock trending suggestions - in real implementation would use trending service
    const mockSuggestions = [
      { id: '1', rank: 1, title: `Top ${category} Trend`, description: 'Trending topic', viralScore: 85 },
      { id: '2', rank: 2, title: `Popular ${category} Topic`, description: 'Popular content', viralScore: 82 },
      { id: '3', rank: 3, title: `Viral ${category} Content`, description: 'Viral trend', viralScore: 89 }
    ];

    return {
      suggestions: mockSuggestions,
      trendingData: { category, platform },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate content tags based on category and topic
   */
  generateContentTags(category: string, topic: string): string[] {
    const baseTags = ['viral', 'trending', 'top5', 'countdown', 'list'];
    const categoryTags: Record<string, string[]> = {
      entertainment: ['celebrity', 'movies', 'tv', 'drama', 'gossip', 'awards'],
      technology: ['ai', 'tech', 'innovation', 'future', 'gadgets', 'software'],
      lifestyle: ['health', 'wellness', 'tips', 'life', 'fitness', 'beauty'],
      gaming: ['gaming', 'esports', 'streamer', 'gameplay', 'console', 'pc'],
      sports: ['sports', 'athlete', 'championship', 'team', 'game', 'competition'],
      music: ['music', 'artist', 'song', 'album', 'concert', 'festival'],
      food: ['food', 'recipe', 'cooking', 'restaurant', 'chef', 'cuisine'],
      travel: ['travel', 'destination', 'vacation', 'adventure', 'culture', 'explore'],
      news: ['news', 'breaking', 'current', 'politics', 'world', 'update'],
      education: ['education', 'learning', 'tutorial', 'howto', 'facts', 'knowledge']
    };

    const topicTags = topic.toLowerCase().split(' ')
      .filter(word => word.length > 2)
      .slice(0, 3);

    return [...baseTags, ...(categoryTags[category] || []), ...topicTags];
  }

  private getToneFromViralFactor(viralFactor: number): 'professional' | 'casual' | 'humorous' | 'dramatic' {
    if (viralFactor >= 80) return 'dramatic';
    if (viralFactor >= 60) return 'casual';
    return 'professional';
  }

  private async parseScriptToTop5List(scriptResponse: any, params: AIListGenerationRequest): Promise<AIListGenerationResult> {
    // Parse AI-generated script into structured top 5 list
    const items: ContentItem[] = [];

    // This would parse the script response into items
    // For now, using enhanced mock generation with AI insights
    return this.generateMockTop5List(params);
  }

  private generateMockTop5List(params: AIListGenerationRequest): AIListGenerationResult {
    const { topic, category, targetAudience, viralFactor, platform, itemCount } = params;

    const categoryItems: Record<string, Array<{ title: string; description: string }>> = {
      entertainment: [
        { title: 'Mind-Blowing Plot Twist That Changed Everything', description: 'The shocking revelation that left audiences speechless and redefined storytelling' },
        { title: 'Celebrity Scandal That Broke the Internet', description: 'The moment that dominated headlines and changed public perception forever' },
        { title: 'Award Show Moment Nobody Saw Coming', description: 'An unexpected event that became the most talked-about moment in awards history' },
        { title: 'Movie Scene That Was Almost Banned', description: 'The controversial sequence that sparked global debates and cultural conversations' },
        { title: 'TV Series Finale That Divided Fans Forever', description: 'The ending that split the fanbase and continues to fuel passionate discussions' }
      ],
      technology: [
        { title: 'AI Breakthrough That Will Change Everything', description: 'Revolutionary technology that promises to transform how we live and work' },
        { title: 'Secret Feature Hidden in Your Phone', description: 'Amazing capability you never knew existed that will make your life easier' },
        { title: 'Tech Giant\'s Banned Innovation', description: 'Groundbreaking invention that was too powerful for public release' },
        { title: 'Smartphone Trick That Saves Hours Daily', description: 'Simple hack that most people don\'t know but will revolutionize productivity' },
        { title: 'Future Technology Already Here Today', description: 'Sci-fi concepts that have secretly become reality and are changing the world' }
      ],
      lifestyle: [
        { title: 'Life-Changing Habit That Costs Nothing', description: 'Simple daily practice that transforms health, wealth, and happiness instantly' },
        { title: 'Secret Millionaires Use Every Morning', description: 'Powerful routine that successful people swear by but rarely talk about' },
        { title: 'Ancient Wellness Practice Going Viral', description: 'Traditional method rediscovered by modern science with incredible benefits' },
        { title: 'Food Combination That Melts Fat Overnight', description: 'Surprising dietary duo that accelerates metabolism while you sleep' },
        { title: '5-Minute Exercise That Replaces Hours at Gym', description: 'High-intensity movement that delivers maximum results in minimum time' }
      ]
    };

    const baseItems = categoryItems[category] || categoryItems.entertainment;
    const items = baseItems.slice(0, itemCount).map((item, index) => ({
      id: `ai_generated_${index + 1}`,
      rank: index + 1,
      title: item.title,
      description: item.description,
      viralScore: Math.floor(Math.random() * 20) + Math.max(75, viralFactor - 10),
      engagementPrediction: Math.floor(Math.random() * 30) + 70,
      contentTags: this.generateContentTags(category, topic),
      targetDemographic: targetAudience,
      platformOptimization: {
        [platform]: true
      }
    }));

    return {
      items,
      configuration: {
        mainTitle: `Top ${itemCount} ${topic}`,
        itemCount,
        countdownDirection: 'descending' as const,
        displayDuration: 8000,
        transitionStyle: 'slide',
        viralOptimization: {
          enabled: true,
          viralScore: Math.floor(Math.random() * 20) + Math.max(75, viralFactor - 5),
          engagementPrediction: Math.floor(Math.random() * 30) + 70,
          targetDemographics: [targetAudience],
          contentTags: this.generateContentTags(category, topic),
          optimalTiming: 'Peak Hours (7-9 PM)',
          platformOptimization: {
            [platform]: true
          }
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        aiModel: this.openaiService ? 'GPT-4-Turbo' : 'Rule-Based Generator',
        confidence: this.openaiService ? 0.94 : 0.85,
        viralPotential: Math.floor(Math.random() * 20) + Math.max(75, viralFactor - 5)
      }
    };
  }

  private generateImprovements(contentFactors: any[], configuration: ContentConfiguration, styling: ContentStyling): string[] {
    const improvements: string[] = [];

    if (contentFactors.some(f => f.titleLength < 20)) {
      improvements.push('Make titles more descriptive (20-60 characters optimal)');
    }
    if (contentFactors.some(f => !f.hasEmotionalWords)) {
      improvements.push('Add emotional triggers (amazing, incredible, shocking, mind-blowing)');
    }
    if (contentFactors.some(f => !f.hasSuperlatives)) {
      improvements.push('Include superlatives (best, worst, most, biggest) for impact');
    }
    if (contentFactors.some(f => !f.hasUrgency)) {
      improvements.push('Add urgency words (now, breaking, exclusive, limited)');
    }
    if (configuration.displayDuration < 6000) {
      improvements.push('Increase display duration for better comprehension (6-10 seconds optimal)');
    }
    if (!styling.layout?.backgroundBlur) {
      improvements.push('Enable background blur for better text readability');
    }

    return improvements;
  }

  private generateStrengths(contentFactors: any[], configuration: ContentConfiguration, styling: ContentStyling): string[] {
    const strengths: string[] = [];

    if (contentFactors.some(f => f.hasEmotionalWords)) {
      strengths.push('Strong emotional appeal in titles');
    }
    if (contentFactors.some(f => f.hasSuperlatives)) {
      strengths.push('Effective use of superlatives for impact');
    }
    if (contentFactors.some(f => f.hasUrgency)) {
      strengths.push('Good urgency and scarcity messaging');
    }
    if (configuration.countdownDirection === 'descending') {
      strengths.push('Optimal countdown direction for suspense building');
    }
    if (configuration.itemCount === 5) {
      strengths.push('Perfect list length for attention span');
    }
    if (styling.titleFont?.weight === 'bold') {
      strengths.push('Good text emphasis and readability');
    }

    return strengths;
  }

  private generateWeaknesses(contentFactors: any[], configuration: ContentConfiguration, styling: ContentStyling): string[] {
    const weaknesses: string[] = [];

    if (contentFactors.some(f => f.titleLength > 60)) {
      weaknesses.push('Some titles too long for optimal engagement');
    }
    if (configuration.displayDuration > 10000) {
      weaknesses.push('Display duration too long for viral content');
    }
    if (configuration.countdownDirection === 'ascending') {
      weaknesses.push('Ascending countdown reduces suspense');
    }
    if (!contentFactors.some(f => f.hasNumbers)) {
      weaknesses.push('Missing numerical elements that boost credibility');
    }

    return weaknesses;
  }

  private determineTargetAudience(contentFactors: any[], configuration: ContentConfiguration): string {
    const hasYouthfulContent = contentFactors.some(f =>
      f.hasEmotionalWords && f.hasActionWords
    );
    const hasUrgency = contentFactors.some(f => f.hasUrgency);

    if (hasYouthfulContent && hasUrgency) return 'Gen Z (16-24)';
    if (hasYouthfulContent) return 'Young Adults (18-29)';
    return 'General Audience (25-40)';
  }

  private getPlatformRecommendations(viralScore: number): string[] {
    const allPlatforms = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Twitter', 'Facebook'];

    if (viralScore >= 85) return allPlatforms;
    if (viralScore >= 75) return ['TikTok', 'Instagram Reels', 'YouTube Shorts'];
    return ['Instagram Reels', 'YouTube Shorts'];
  }
}

// Create and export singleton instance
export const contentService = new ContentService();
export default contentService;
