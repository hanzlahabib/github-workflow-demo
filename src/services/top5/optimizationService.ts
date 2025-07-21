import type { ContentItem, ContentConfiguration, ContentStyling } from './contentService';
import type { ViralTemplate } from './templateService';

export interface OptimizationRequest {
  items: ContentItem[];
  configuration: ContentConfiguration;
  styling: ContentStyling;
  targetPlatforms: string[];
  targetAudience?: string;
  goals?: OptimizationGoal[];
}

export interface OptimizationGoal {
  type: 'views' | 'engagement' | 'shares' | 'retention' | 'conversion';
  weight: number; // 0-1
  targetValue?: number;
}

export interface OptimizationSuggestion {
  category: 'content' | 'timing' | 'styling' | 'platform' | 'audience';
  priority: 'high' | 'medium' | 'low';
  impact: number; // 0-100
  effort: 'low' | 'medium' | 'high';
  suggestion: string;
  reasoning: string;
  implementation: string;
  expectedImprovement: string;
}

export interface OptimizationResult {
  currentScore: number;
  optimizedScore: number;
  improvement: number;
  suggestions: OptimizationSuggestion[];
  optimizedConfiguration: ContentConfiguration;
  optimizedStyling: ContentStyling;
  platformSpecificTips: { platform: string; tips: string[] }[];
  contentOptimizations: {
    itemIndex: number;
    originalTitle: string;
    optimizedTitle: string;
    improvements: string[];
  }[];
}

export interface A11yOptimization {
  colorContrast: {
    current: number;
    recommended: number;
    passes: boolean;
  };
  textReadability: {
    score: number;
    recommendations: string[];
  };
  accessibilityScore: number;
  improvements: string[];
}

export interface SEOOptimization {
  titleOptimization: {
    current: string;
    optimized: string;
    keywordDensity: number;
    readabilityScore: number;
  };
  descriptionOptimization: {
    current: string;
    optimized: string;
    length: number;
    keywordUsage: number;
  };
  tags: {
    recommended: string[];
    trending: string[];
    niche: string[];
  };
  metaScore: number;
}

export class OptimizationService {
  /**
   * Generate comprehensive optimization suggestions
   */
  async generateOptimizations(request: OptimizationRequest): Promise<OptimizationResult> {
    const { items, configuration, styling, targetPlatforms, targetAudience, goals } = request;

    // Calculate current viral score
    const currentScore = this.calculateViralScore(items, configuration, styling);

    // Generate optimization suggestions
    const suggestions = await this.generateSuggestions(request, currentScore);

    // Apply optimizations to get projected score
    const { optimizedConfig, optimizedStyling } = this.applyOptimizations(configuration, styling, suggestions);
    const optimizedScore = this.calculateViralScore(items, optimizedConfig, optimizedStyling);

    // Generate content optimizations
    const contentOptimizations = this.optimizeContentItems(items, targetPlatforms, targetAudience);

    // Generate platform-specific tips
    const platformSpecificTips = this.generatePlatformTips(targetPlatforms, items);

    return {
      currentScore,
      optimizedScore,
      improvement: optimizedScore - currentScore,
      suggestions: suggestions.sort((a, b) =>
        (b.priority === 'high' ? 3 : b.priority === 'medium' ? 2 : 1) -
        (a.priority === 'high' ? 3 : a.priority === 'medium' ? 2 : 1)
      ),
      optimizedConfiguration: optimizedConfig,
      optimizedStyling: optimizedStyling,
      platformSpecificTips,
      contentOptimizations
    };
  }

  /**
   * Optimize for accessibility
   */
  optimizeAccessibility(styling: ContentStyling): A11yOptimization {
    const currentContrast = this.calculateColorContrast(styling);
    const textReadability = this.analyzeTextReadability(styling);

    const improvements: string[] = [];

    if (currentContrast < 4.5) {
      improvements.push('Increase color contrast ratio to at least 4.5:1');
      improvements.push('Use darker text on light backgrounds');
    }

    if (textReadability.score < 70) {
      improvements.push('Increase font size for better readability');
      improvements.push('Add text shadows or outlines for better visibility');
    }

    if (!styling.layout?.backgroundBlur) {
      improvements.push('Enable background blur to improve text legibility');
    }

    const accessibilityScore = this.calculateAccessibilityScore(currentContrast, textReadability.score);

    return {
      colorContrast: {
        current: currentContrast,
        recommended: 4.5,
        passes: currentContrast >= 4.5
      },
      textReadability: {
        score: textReadability.score,
        recommendations: textReadability.recommendations
      },
      accessibilityScore,
      improvements
    };
  }

  /**
   * Optimize for SEO and discoverability
   */
  optimizeSEO(items: ContentItem[], category: string, platform: string): SEOOptimization {
    const mainTitle = items.length > 0 ? `Top ${items.length} ${category}` : 'Top 5 List';
    const description = this.generateOptimizedDescription(items, category);

    return {
      titleOptimization: {
        current: mainTitle,
        optimized: this.optimizeTitle(mainTitle, platform),
        keywordDensity: this.calculateKeywordDensity(mainTitle, category),
        readabilityScore: this.calculateReadabilityScore(mainTitle)
      },
      descriptionOptimization: {
        current: description,
        optimized: this.optimizeDescription(description, category, platform),
        length: description.length,
        keywordUsage: this.countKeywordUsage(description, category)
      },
      tags: {
        recommended: this.getRecommendedTags(category, platform),
        trending: this.getTrendingTags(category),
        niche: this.getNicheTags(items)
      },
      metaScore: this.calculateMetaScore(mainTitle, description, category)
    };
  }

  /**
   * Optimize posting schedule for maximum reach
   */
  optimizePostingSchedule(platforms: string[], timezone: string = 'UTC'): {
    platform: string;
    optimalTime: string;
    reason: string;
    alternativeTimes: string[];
    dayOfWeek: string[];
  }[] {
    const platformSchedules = {
      tiktok: {
        optimalTime: '19:00',
        reason: 'Peak engagement during evening entertainment hours',
        alternativeTimes: ['12:00', '15:00', '21:00'],
        dayOfWeek: ['Tuesday', 'Thursday', 'Friday']
      },
      instagram: {
        optimalTime: '18:00',
        reason: 'Maximum reach during post-work social browsing',
        alternativeTimes: ['11:00', '13:00', '20:00'],
        dayOfWeek: ['Wednesday', 'Friday', 'Saturday']
      },
      youtube: {
        optimalTime: '20:00',
        reason: 'Prime time for video consumption',
        alternativeTimes: ['14:00', '16:00', '22:00'],
        dayOfWeek: ['Thursday', 'Friday', 'Saturday']
      },
      twitter: {
        optimalTime: '12:00',
        reason: 'Lunch break peak activity period',
        alternativeTimes: ['09:00', '17:00', '19:00'],
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday']
      },
      facebook: {
        optimalTime: '14:00',
        reason: 'Afternoon social media check-ins',
        alternativeTimes: ['10:00', '16:00', '19:00'],
        dayOfWeek: ['Wednesday', 'Thursday', 'Sunday']
      }
    };

    return platforms.map(platform => {
      const schedule = platformSchedules[platform.toLowerCase() as keyof typeof platformSchedules];
      return {
        platform,
        ...schedule,
      };
    });
  }

  /**
   * Generate platform-specific content variations
   */
  generatePlatformVariations(
    items: ContentItem[],
    originalConfig: ContentConfiguration,
    targetPlatforms: string[]
  ): { platform: string; optimizedItems: ContentItem[]; optimizedConfig: ContentConfiguration }[] {
    return targetPlatforms.map(platform => {
      const optimizedItems = items.map(item => ({
        ...item,
        title: this.optimizeTitleForPlatform(item.title, platform),
        description: this.optimizeDescriptionForPlatform(item.description, platform)
      }));

      const optimizedConfig = {
        ...originalConfig,
        displayDuration: this.getOptimalDurationForPlatform(platform),
        transitionStyle: this.getOptimalTransitionForPlatform(platform)
      };

      return {
        platform,
        optimizedItems,
        optimizedConfig
      };
    });
  }

  private async generateSuggestions(
    request: OptimizationRequest,
    currentScore: number
  ): Promise<OptimizationSuggestion[]> {
    const { items, configuration, styling, targetPlatforms } = request;
    const suggestions: OptimizationSuggestion[] = [];

    // Content optimizations
    suggestions.push(...this.generateContentSuggestions(items, currentScore));

    // Configuration optimizations
    suggestions.push(...this.generateConfigurationSuggestions(configuration));

    // Styling optimizations
    suggestions.push(...this.generateStylingSuggestions(styling));

    // Platform optimizations
    suggestions.push(...this.generatePlatformSuggestions(targetPlatforms, items));

    // Timing optimizations
    suggestions.push(...this.generateTimingSuggestions(targetPlatforms));

    return suggestions;
  }

  private generateContentSuggestions(items: ContentItem[], currentScore: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check title optimization
    const shortTitles = items.filter(item => item.title.length < 20);
    if (shortTitles.length > 0) {
      suggestions.push({
        category: 'content',
        priority: 'high',
        impact: 85,
        effort: 'low',
        suggestion: 'Expand short titles to 20-60 characters',
        reasoning: 'Optimal title length increases engagement and provides context',
        implementation: 'Add descriptive adjectives and specific details to titles',
        expectedImprovement: '+12-18 viral score points'
      });
    }

    // Check emotional triggers
    const emotionalWords = /amazing|incredible|shocking|unbelievable|stunning|mind-blowing/i;
    const itemsWithoutEmotions = items.filter(item => !emotionalWords.test(item.title));
    if (itemsWithoutEmotions.length > items.length * 0.5) {
      suggestions.push({
        category: 'content',
        priority: 'high',
        impact: 90,
        effort: 'medium',
        suggestion: 'Add emotional triggers to titles',
        reasoning: 'Emotional words increase click-through rates and engagement',
        implementation: 'Include words like "shocking," "incredible," "mind-blowing"',
        expectedImprovement: '+15-25 viral score points'
      });
    }

    // Check for numbers and specificity
    const numbersPattern = /\d+/;
    const itemsWithoutNumbers = items.filter(item => !numbersPattern.test(item.title));
    if (itemsWithoutNumbers.length > items.length * 0.6) {
      suggestions.push({
        category: 'content',
        priority: 'medium',
        impact: 70,
        effort: 'low',
        suggestion: 'Include specific numbers and statistics',
        reasoning: 'Numbers add credibility and specificity to content',
        implementation: 'Add percentages, years, amounts, or rankings',
        expectedImprovement: '+8-12 viral score points'
      });
    }

    return suggestions;
  }

  private generateConfigurationSuggestions(configuration: ContentConfiguration): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (configuration.countdownDirection === 'ascending') {
      suggestions.push({
        category: 'content',
        priority: 'medium',
        impact: 75,
        effort: 'low',
        suggestion: 'Change countdown direction to descending',
        reasoning: 'Descending countdowns build suspense and maintain attention',
        implementation: 'Switch from ascending (1-5) to descending (5-1) order',
        expectedImprovement: '+8-12 viral score points'
      });
    }

    if (configuration.displayDuration < 6000) {
      suggestions.push({
        category: 'timing',
        priority: 'medium',
        impact: 60,
        effort: 'low',
        suggestion: 'Increase display duration to 6-10 seconds per item',
        reasoning: 'Sufficient time for comprehension improves retention',
        implementation: 'Adjust timing to 6000-10000ms per item',
        expectedImprovement: '+5-8 viral score points'
      });
    }

    if (configuration.displayDuration > 12000) {
      suggestions.push({
        category: 'timing',
        priority: 'high',
        impact: 80,
        effort: 'low',
        suggestion: 'Reduce display duration for viral content',
        reasoning: 'Shorter attention spans require faster pacing',
        implementation: 'Reduce to 6-8 seconds per item for optimal engagement',
        expectedImprovement: '+10-15 viral score points'
      });
    }

    return suggestions;
  }

  private generateStylingSuggestions(styling: ContentStyling): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (!styling.layout?.backgroundBlur) {
      suggestions.push({
        category: 'styling',
        priority: 'medium',
        impact: 65,
        effort: 'low',
        suggestion: 'Enable background blur for better readability',
        reasoning: 'Background blur improves text legibility and professional appearance',
        implementation: 'Add blur effect to background elements',
        expectedImprovement: '+3-5 viral score points'
      });
    }

    if (styling.titleFont?.weight !== 'bold') {
      suggestions.push({
        category: 'styling',
        priority: 'low',
        impact: 45,
        effort: 'low',
        suggestion: 'Use bold font weight for titles',
        reasoning: 'Bold text improves readability and impact',
        implementation: 'Set font-weight to bold for all titles',
        expectedImprovement: '+2-4 viral score points'
      });
    }

    return suggestions;
  }

  private generatePlatformSuggestions(platforms: string[], items: ContentItem[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (platforms.includes('tiktok')) {
      suggestions.push({
        category: 'platform',
        priority: 'high',
        impact: 85,
        effort: 'medium',
        suggestion: 'Optimize for TikTok vertical format and trends',
        reasoning: 'TikTok\'s algorithm favors trending formats and vertical videos',
        implementation: 'Use 9:16 aspect ratio, trending hashtags, and fast pacing',
        expectedImprovement: '+15-20 viral score points'
      });
    }

    if (platforms.includes('instagram')) {
      suggestions.push({
        category: 'platform',
        priority: 'medium',
        impact: 70,
        effort: 'medium',
        suggestion: 'Create Instagram-optimized captions and hashtags',
        reasoning: 'Instagram\'s discover algorithm relies on hashtags and captions',
        implementation: 'Use 3-5 relevant hashtags and engaging captions',
        expectedImprovement: '+8-12 viral score points'
      });
    }

    if (platforms.length > 3) {
      suggestions.push({
        category: 'platform',
        priority: 'medium',
        impact: 60,
        effort: 'high',
        suggestion: 'Create platform-specific variations',
        reasoning: 'Different platforms have unique audiences and preferences',
        implementation: 'Customize content length, style, and format per platform',
        expectedImprovement: '+10-15 viral score points'
      });
    }

    return suggestions;
  }

  private generateTimingSuggestions(platforms: string[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    suggestions.push({
      category: 'timing',
      priority: 'high',
      impact: 75,
      effort: 'low',
      suggestion: 'Post during optimal hours for each platform',
      reasoning: 'Timing significantly affects initial engagement and algorithm boost',
      implementation: 'Schedule posts for platform-specific peak hours',
      expectedImprovement: '+10-15 viral score points'
    });

    if (platforms.length > 1) {
      suggestions.push({
        category: 'timing',
        priority: 'medium',
        impact: 65,
        effort: 'medium',
        suggestion: 'Stagger posts across platforms for maximum impact',
        reasoning: 'Sequential posting allows cross-platform momentum building',
        implementation: 'Post on highest-potential platform first, then cross-post within 2-4 hours',
        expectedImprovement: '+8-12 viral score points'
      });
    }

    return suggestions;
  }

  private applyOptimizations(
    configuration: ContentConfiguration,
    styling: ContentStyling,
    suggestions: OptimizationSuggestion[]
  ): { optimizedConfig: ContentConfiguration; optimizedStyling: ContentStyling } {
    const optimizedConfig = { ...configuration };
    let optimizedStyling = { ...styling };

    suggestions.forEach(suggestion => {
      switch (suggestion.category) {
        case 'content':
          if (suggestion.suggestion.includes('countdown direction')) {
            optimizedConfig.countdownDirection = 'descending';
          }
          break;
        case 'timing':
          if (suggestion.suggestion.includes('display duration') && suggestion.suggestion.includes('Increase')) {
            optimizedConfig.displayDuration = Math.max(optimizedConfig.displayDuration, 6000);
          } else if (suggestion.suggestion.includes('display duration') && suggestion.suggestion.includes('Reduce')) {
            optimizedConfig.displayDuration = Math.min(optimizedConfig.displayDuration, 8000);
          }
          break;
        case 'styling':
          if (suggestion.suggestion.includes('background blur')) {
            optimizedStyling = {
              ...optimizedStyling,
              layout: { ...optimizedStyling.layout, backgroundBlur: true }
            };
          }
          if (suggestion.suggestion.includes('bold font')) {
            optimizedStyling = {
              ...optimizedStyling,
              titleFont: { ...optimizedStyling.titleFont, weight: 'bold' }
            };
          }
          break;
      }
    });

    return { optimizedConfig, optimizedStyling };
  }

  private optimizeContentItems(
    items: ContentItem[],
    platforms: string[],
    audience?: string
  ): {
    itemIndex: number;
    originalTitle: string;
    optimizedTitle: string;
    improvements: string[];
  }[] {
    return items.map((item, index) => {
      const improvements: string[] = [];
      let optimizedTitle = item.title;

      // Add emotional triggers if missing
      if (!/amazing|incredible|shocking|unbelievable|stunning/i.test(optimizedTitle)) {
        const triggers = ['Shocking', 'Incredible', 'Amazing', 'Unbelievable'];
        const trigger = triggers[Math.floor(Math.random() * triggers.length)];
        optimizedTitle = `${trigger} ${optimizedTitle}`;
        improvements.push('Added emotional trigger');
      }

      // Add numbers if missing
      if (!/\d+/.test(optimizedTitle) && Math.random() > 0.5) {
        // Add year or percentage
        optimizedTitle = optimizedTitle.replace(/\b(fact|truth|secret)\b/i, '$1 from 2024');
        improvements.push('Added specific year/number');
      }

      // Optimize length
      if (optimizedTitle.length < 20) {
        optimizedTitle += ' You Never Knew About';
        improvements.push('Extended title length');
      }

      return {
        itemIndex: index,
        originalTitle: item.title,
        optimizedTitle,
        improvements
      };
    });
  }

  private generatePlatformTips(platforms: string[], items: ContentItem[]): { platform: string; tips: string[] }[] {
    return platforms.map(platform => ({
      platform,
      tips: this.getPlatformSpecificTips(platform, items)
    }));
  }

  private getPlatformSpecificTips(platform: string, items: ContentItem[]): string[] {
    const platformTips = {
      tiktok: [
        'Use trending hashtags and sounds',
        'Keep text large and readable on mobile',
        'Add captions for accessibility',
        'Post during peak hours (6-10 PM)',
        'Engage with comments quickly',
        'Use vertical 9:16 format'
      ],
      instagram: [
        'Create eye-catching thumbnails',
        'Use 3-5 strategic hashtags',
        'Write engaging captions',
        'Post stories for additional reach',
        'Use Instagram Reels for higher visibility',
        'Maintain consistent visual style'
      ],
      youtube: [
        'Optimize video titles for search',
        'Create compelling thumbnails',
        'Add detailed descriptions',
        'Use relevant tags',
        'Include call-to-actions',
        'Enable subtitles/captions'
      ],
      twitter: [
        'Create thread versions for detailed content',
        'Use relevant hashtags sparingly',
        'Tweet during business hours',
        'Engage with replies and retweets',
        'Keep text concise and impactful',
        'Add alt text to images'
      ]
    };

    return platformTips[platform.toLowerCase() as keyof typeof platformTips] || [
      'Optimize content for platform audience',
      'Use platform-specific features',
      'Post during optimal times',
      'Engage with audience regularly'
    ];
  }

  private calculateViralScore(items: ContentItem[], configuration: ContentConfiguration, styling: ContentStyling): number {
    let score = 50;

    // Content analysis
    const avgTitleLength = items.reduce((sum, item) => sum + item.title.length, 0) / items.length;
    if (avgTitleLength >= 20 && avgTitleLength <= 60) score += 15;

    const hasEmotionalWords = items.some(item =>
      /amazing|incredible|shocking|unbelievable|stunning/i.test(item.title)
    );
    if (hasEmotionalWords) score += 20;

    const hasNumbers = items.some(item => /\d+/.test(item.title));
    if (hasNumbers) score += 10;

    // Configuration factors
    if (configuration.countdownDirection === 'descending') score += 12;
    if (configuration.displayDuration >= 6000 && configuration.displayDuration <= 10000) score += 8;

    // Styling factors
    if (styling.layout?.backgroundBlur) score += 3;
    if (styling.titleFont?.weight === 'bold') score += 2;

    return Math.min(score, 100);
  }

  // Helper methods for SEO and accessibility
  private calculateColorContrast(styling: ContentStyling): number {
    // Mock calculation - in real implementation, would analyze actual colors
    return 4.2; // Example contrast ratio
  }

  private analyzeTextReadability(styling: ContentStyling): { score: number; recommendations: string[] } {
    return {
      score: 75,
      recommendations: ['Increase font size', 'Add text shadows', 'Use high contrast colors']
    };
  }

  private calculateAccessibilityScore(contrast: number, readability: number): number {
    return Math.min(((contrast / 4.5) * 50) + (readability / 100) * 50, 100);
  }

  private optimizeTitle(title: string, platform: string): string {
    const platformOptimizations = {
      tiktok: (t: string) => t.length > 40 ? t.substring(0, 37) + '...' : t,
      instagram: (t: string) => t,
      youtube: (t: string) => t.length > 70 ? t.substring(0, 67) + '...' : t,
      twitter: (t: string) => t.length > 50 ? t.substring(0, 47) + '...' : t
    };

    const optimizer = platformOptimizations[platform.toLowerCase() as keyof typeof platformOptimizations];
    return optimizer ? optimizer(title) : title;
  }

  private optimizeDescription(description: string, category: string, platform: string): string {
    // Add category-specific keywords and optimize for platform
    return `${description} #${category} #viral #trending`;
  }

  private generateOptimizedDescription(items: ContentItem[], category: string): string {
    return `Discover the top ${items.length} ${category} that will blow your mind! From ${items[0]?.title || 'incredible facts'} to ${items[items.length - 1]?.title || 'shocking revelations'}, this countdown will keep you watching until the end.`;
  }

  private calculateKeywordDensity(text: string, keyword: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const keywordCount = words.filter(word => word.includes(keyword.toLowerCase())).length;
    return (keywordCount / words.length) * 100;
  }

  private calculateReadabilityScore(text: string): number {
    // Simplified readability score
    const words = text.split(/\s+/).length;
    const syllables = text.replace(/[^aeiou]/gi, '').length;
    return Math.max(100 - (syllables / words) * 10, 0);
  }

  private countKeywordUsage(text: string, keyword: string): number {
    return (text.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
  }

  private getRecommendedTags(category: string, platform: string): string[] {
    const baseTags = ['viral', 'trending', 'top5', 'countdown', 'list'];
    const categoryTags = {
      entertainment: ['movies', 'celebrity', 'tv', 'drama'],
      technology: ['tech', 'ai', 'innovation', 'future'],
      gaming: ['gaming', 'esports', 'streamer', 'gameplay'],
      lifestyle: ['lifestyle', 'tips', 'wellness', 'life']
    };

    return [...baseTags, ...(categoryTags[category as keyof typeof categoryTags] || [])];
  }

  private getTrendingTags(category: string): string[] {
    // Mock trending tags - in real implementation, would fetch from APIs
    return ['2024', 'viral', 'fyp', 'trending', 'new'];
  }

  private getNicheTags(items: ContentItem[]): string[] {
    // Extract niche tags from content
    return items.flatMap(item => item.contentTags || []).slice(0, 5);
  }

  private calculateMetaScore(title: string, description: string, category: string): number {
    let score = 0;

    // Title optimization
    if (title.length >= 20 && title.length <= 60) score += 25;
    if (/\d+/.test(title)) score += 15;
    if (/amazing|incredible|shocking/i.test(title)) score += 20;

    // Description optimization
    if (description.length >= 100 && description.length <= 300) score += 25;
    if (description.includes(category)) score += 15;

    return Math.min(score, 100);
  }

  private optimizeTitleForPlatform(title: string, platform: string): string {
    const maxLengths = {
      tiktok: 40,
      instagram: 125,
      youtube: 70,
      twitter: 50
    };

    const maxLength = maxLengths[platform.toLowerCase() as keyof typeof maxLengths] || 100;

    if (title.length > maxLength) {
      return title.substring(0, maxLength - 3) + '...';
    }

    return title;
  }

  private optimizeDescriptionForPlatform(description: string, platform: string): string {
    const maxLengths = {
      tiktok: 150,
      instagram: 300,
      youtube: 500,
      twitter: 280
    };

    const maxLength = maxLengths[platform.toLowerCase() as keyof typeof maxLengths] || 300;

    if (description.length > maxLength) {
      return description.substring(0, maxLength - 3) + '...';
    }

    return description;
  }

  private getOptimalDurationForPlatform(platform: string): number {
    const durations = {
      tiktok: 5000,    // Fast-paced
      instagram: 6000, // Moderate
      youtube: 8000,   // Longer for retention
      twitter: 4000    // Very quick
    };

    return durations[platform.toLowerCase() as keyof typeof durations] || 6000;
  }

  private getOptimalTransitionForPlatform(platform: string): string {
    const transitions = {
      tiktok: 'quick',
      instagram: 'smooth',
      youtube: 'fade',
      twitter: 'instant'
    };

    return transitions[platform.toLowerCase() as keyof typeof transitions] || 'smooth';
  }
}

// Create and export singleton instance
export const optimizationService = new OptimizationService();
export default optimizationService;
