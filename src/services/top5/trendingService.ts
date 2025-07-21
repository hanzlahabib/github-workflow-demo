export interface TrendingTopic {
  topic: string;
  viralScore: number;
  category: string;
  engagement: string;
  growth?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  demographics?: string;
  timeframe?: string;
}

export interface TrendingAnalysisRequest {
  category?: string;
  platform?: string;
  timeframe?: '24h' | '7d' | '30d';
  region?: string;
}

export interface TrendingAnalysisResult {
  topics: TrendingTopic[];
  generatedAt: string;
  category: string;
  platform: string;
  confidence: number;
  metadata: {
    totalAnalyzed: number;
    trendingThreshold: number;
    lastUpdated: string;
  };
}

export class TrendingService {
  private static readonly TRENDING_DATA = {
    general: [
      { topic: 'AI Technology Breakthroughs 2024', viralScore: 92, category: 'technology', engagement: '2.3M', growth: '+45%', sentiment: 'positive' as const },
      { topic: 'Viral TikTok Dance Challenges', viralScore: 95, category: 'entertainment', engagement: '4.1M', growth: '+120%', sentiment: 'positive' as const },
      { topic: 'Celebrity Fashion Moments', viralScore: 88, category: 'entertainment', engagement: '3.2M', growth: '+67%', sentiment: 'positive' as const },
      { topic: 'Cryptocurrency Market Updates', viralScore: 85, category: 'finance', engagement: '1.8M', growth: '+23%', sentiment: 'neutral' as const },
      { topic: 'Mental Health Awareness Campaigns', viralScore: 90, category: 'lifestyle', engagement: '2.7M', growth: '+89%', sentiment: 'positive' as const },
      { topic: 'Climate Change Solutions', viralScore: 82, category: 'environment', engagement: '1.5M', growth: '+34%', sentiment: 'positive' as const },
      { topic: 'Gaming Industry Controversies', viralScore: 87, category: 'gaming', engagement: '2.1M', growth: '+56%', sentiment: 'negative' as const },
      { topic: 'International Food Trends', viralScore: 89, category: 'food', engagement: '2.9M', growth: '+78%', sentiment: 'positive' as const },
      { topic: 'Hidden Travel Destinations', viralScore: 84, category: 'travel', engagement: '2.0M', growth: '+41%', sentiment: 'positive' as const },
      { topic: 'Fitness Transformation Stories', viralScore: 86, category: 'health', engagement: '2.4M', growth: '+52%', sentiment: 'positive' as const }
    ],
    entertainment: [
      { topic: 'Shocking Movie Plot Reveals', viralScore: 94, category: 'movies', engagement: '3.8M', growth: '+134%', sentiment: 'positive' as const },
      { topic: 'TV Series Finale Reactions', viralScore: 91, category: 'television', engagement: '3.1M', growth: '+98%', sentiment: 'positive' as const },
      { topic: 'Celebrity Relationship Drama', viralScore: 96, category: 'celebrity', engagement: '4.5M', growth: '+156%', sentiment: 'negative' as const },
      { topic: 'Music Artist Collaborations', viralScore: 89, category: 'music', engagement: '2.8M', growth: '+73%', sentiment: 'positive' as const },
      { topic: 'Award Show Controversies 2024', viralScore: 92, category: 'awards', engagement: '3.4M', growth: '+112%', sentiment: 'negative' as const },
      { topic: 'Behind-the-Scenes Movie Secrets', viralScore: 88, category: 'movies', engagement: '2.6M', growth: '+67%', sentiment: 'positive' as const },
      { topic: 'Streaming Platform Wars', viralScore: 85, category: 'streaming', engagement: '2.2M', growth: '+43%', sentiment: 'neutral' as const }
    ],
    technology: [
      { topic: 'Revolutionary AI Applications', viralScore: 93, category: 'artificial-intelligence', engagement: '2.7M', growth: '+89%', sentiment: 'positive' as const },
      { topic: 'Latest Smartphone Innovations', viralScore: 88, category: 'mobile', engagement: '2.2M', growth: '+56%', sentiment: 'positive' as const },
      { topic: 'Social Media Algorithm Changes', viralScore: 90, category: 'social-media', engagement: '3.0M', growth: '+78%', sentiment: 'negative' as const },
      { topic: 'Next-Gen Gaming Hardware', viralScore: 85, category: 'gaming', engagement: '1.9M', growth: '+34%', sentiment: 'positive' as const },
      { topic: 'Electric Vehicle Breakthroughs', viralScore: 87, category: 'automotive', engagement: '2.1M', growth: '+45%', sentiment: 'positive' as const },
      { topic: 'Cybersecurity Threats 2024', viralScore: 82, category: 'security', engagement: '1.4M', growth: '+23%', sentiment: 'negative' as const },
      { topic: 'Space Technology Advances', viralScore: 84, category: 'space', engagement: '1.8M', growth: '+38%', sentiment: 'positive' as const }
    ],
    lifestyle: [
      { topic: 'Wellness Trends That Actually Work', viralScore: 89, category: 'wellness', engagement: '3.2M', growth: '+94%', sentiment: 'positive' as const },
      { topic: 'Sustainable Living Hacks', viralScore: 87, category: 'sustainability', engagement: '2.5M', growth: '+67%', sentiment: 'positive' as const },
      { topic: 'Productivity Methods Going Viral', viralScore: 91, category: 'productivity', engagement: '2.8M', growth: '+103%', sentiment: 'positive' as const },
      { topic: 'Home Design Trends 2024', viralScore: 85, category: 'home', engagement: '2.1M', growth: '+56%', sentiment: 'positive' as const },
      { topic: 'Mindfulness Techniques for Stress', viralScore: 88, category: 'mental-health', engagement: '2.4M', growth: '+78%', sentiment: 'positive' as const }
    ],
    gaming: [
      { topic: 'Most Anticipated Game Releases', viralScore: 92, category: 'gaming', engagement: '3.5M', growth: '+128%', sentiment: 'positive' as const },
      { topic: 'Esports Championship Upsets', viralScore: 89, category: 'esports', engagement: '2.7M', growth: '+87%', sentiment: 'positive' as const },
      { topic: 'Gaming Streamer Controversies', viralScore: 94, category: 'streaming', engagement: '3.1M', growth: '+145%', sentiment: 'negative' as const },
      { topic: 'Hidden Gaming Easter Eggs', viralScore: 86, category: 'gaming', engagement: '2.3M', growth: '+62%', sentiment: 'positive' as const }
    ],
    sports: [
      { topic: 'Olympic Record Breakers', viralScore: 95, category: 'olympics', engagement: '4.2M', growth: '+167%', sentiment: 'positive' as const },
      { topic: 'Underdog Victory Stories', viralScore: 91, category: 'sports', engagement: '3.0M', growth: '+98%', sentiment: 'positive' as const },
      { topic: 'Athlete Comeback Journeys', viralScore: 89, category: 'inspiration', engagement: '2.6M', growth: '+76%', sentiment: 'positive' as const },
      { topic: 'Sports Science Breakthroughs', viralScore: 84, category: 'science', engagement: '1.9M', growth: '+41%', sentiment: 'positive' as const }
    ]
  };

  /**
   * Analyze trending topics based on category and platform
   */
  async analyzeTrendingTopics(request: TrendingAnalysisRequest): Promise<TrendingAnalysisResult> {
    const { category = 'general', platform = 'all', timeframe = '24h', region = 'global' } = request;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    let topics: TrendingTopic[] = [...(TrendingService.TRENDING_DATA[category as keyof typeof TrendingService.TRENDING_DATA] ||
                TrendingService.TRENDING_DATA.general)];

    // Apply platform-specific filtering and scoring adjustments
    topics = this.applyPlatformFiltering(topics, platform);

    // Apply timeframe-based score adjustments
    topics = this.applyTimeframeAdjustments(topics, timeframe);

    // Add demographic information
    topics = topics.map(topic => ({
      ...topic,
      demographics: this.getDemographicsForCategory(topic.category),
      timeframe: this.getOptimalTimeframe(topic.category)
    }));

    // Sort by viral score
    topics.sort((a, b) => b.viralScore - a.viralScore);

    return {
      topics: topics.slice(0, 10), // Return top 10
      generatedAt: new Date().toISOString(),
      category,
      platform,
      confidence: 0.92,
      metadata: {
        totalAnalyzed: topics.length * 1000, // Simulate large dataset
        trendingThreshold: 80,
        lastUpdated: new Date(Date.now() - Math.random() * 3600000).toISOString() // Within last hour
      }
    };
  }

  /**
   * Get trending topics for a specific platform
   */
  async getTrendingTopicsForPlatform(platform: string, limit: number = 10): Promise<TrendingTopic[]> {
    const allTopics = Object.values(TrendingService.TRENDING_DATA).flat();
    const platformOptimizedTopics = this.applyPlatformFiltering(allTopics, platform);

    return platformOptimizedTopics
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, limit);
  }

  /**
   * Predict viral potential of a topic
   */
  predictViralPotential(topic: string, category: string, platform: string): {
    viralScore: number;
    confidence: number;
    factors: string[];
    recommendations: string[];
  } {
    let viralScore = 50;
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Analyze topic characteristics
    const topicLower = topic.toLowerCase();

    // Positive factors
    if (topicLower.includes('secret') || topicLower.includes('hidden')) {
      viralScore += 15;
      factors.push('Mystery and exclusivity appeal');
    }

    if (topicLower.includes('shocking') || topicLower.includes('incredible')) {
      viralScore += 12;
      factors.push('Strong emotional triggers');
    }

    if (topicLower.includes('2024') || topicLower.includes('new') || topicLower.includes('latest')) {
      viralScore += 10;
      factors.push('Timeliness and relevance');
    }

    if (/\d+/.test(topicLower)) {
      viralScore += 8;
      factors.push('Numerical specificity');
    }

    // Platform-specific adjustments
    const platformMultipliers = {
      tiktok: 1.3,
      instagram: 1.2,
      youtube: 1.1,
      twitter: 1.0,
      facebook: 0.9
    };

    viralScore *= platformMultipliers[platform.toLowerCase() as keyof typeof platformMultipliers] || 1.0;

    // Category-specific adjustments
    const categoryBoosts = {
      entertainment: 15,
      technology: 10,
      gaming: 12,
      lifestyle: 8,
      sports: 13
    };

    viralScore += categoryBoosts[category as keyof typeof categoryBoosts] || 5;

    // Generate recommendations
    if (viralScore < 70) {
      recommendations.push('Add emotional triggers (amazing, shocking, incredible)');
      recommendations.push('Include numbers or specific data points');
      recommendations.push('Add urgency or scarcity elements');
    }

    if (viralScore < 80) {
      recommendations.push('Consider trending hashtags and keywords');
      recommendations.push('Optimize for platform-specific audience');
    }

    viralScore = Math.min(viralScore, 100);

    return {
      viralScore: Math.round(viralScore),
      confidence: viralScore > 80 ? 0.9 : viralScore > 60 ? 0.75 : 0.6,
      factors,
      recommendations
    };
  }

  private applyPlatformFiltering(topics: TrendingTopic[], platform: string): TrendingTopic[] {
    if (platform === 'all') return topics;

    // Platform-specific content preferences
    const platformPreferences = {
      tiktok: ['entertainment', 'gaming', 'music', 'dance', 'comedy'],
      instagram: ['lifestyle', 'fashion', 'food', 'travel', 'fitness'],
      youtube: ['education', 'technology', 'gaming', 'entertainment'],
      twitter: ['news', 'politics', 'technology', 'sports'],
      facebook: ['lifestyle', 'news', 'family', 'community']
    };

    const preferences = platformPreferences[platform.toLowerCase() as keyof typeof platformPreferences];

    if (!preferences) return topics;

    return topics.map(topic => ({
      ...topic,
      viralScore: preferences.includes(topic.category) ?
        Math.min(topic.viralScore + 10, 100) :
        Math.max(topic.viralScore - 5, 0)
    }));
  }

  private applyTimeframeAdjustments(topics: TrendingTopic[], timeframe: string): TrendingTopic[] {
    const adjustments = {
      '24h': 1.2, // Recent topics get boost
      '7d': 1.0,  // Neutral
      '30d': 0.9  // Older trends lose some score
    };

    const multiplier = adjustments[timeframe as keyof typeof adjustments] || 1.0;

    return topics.map(topic => ({
      ...topic,
      viralScore: Math.min(Math.round(topic.viralScore * multiplier), 100)
    }));
  }

  private getDemographicsForCategory(category: string): string {
    const demographics = {
      entertainment: 'Gen Z & Millennials (16-34)',
      technology: 'Tech Enthusiasts (20-45)',
      gaming: 'Gamers (16-35)',
      lifestyle: 'Young Adults (20-40)',
      sports: 'Sports Fans (18-55)',
      music: 'Music Lovers (16-30)',
      food: 'Food Enthusiasts (25-50)',
      travel: 'Travelers (25-45)',
      health: 'Health Conscious (25-55)',
      finance: 'Professionals (25-50)'
    };

    return demographics[category as keyof typeof demographics] || 'General Audience (18-45)';
  }

  private getOptimalTimeframe(category: string): string {
    const timeframes = {
      entertainment: 'Peak: 7-9 PM',
      gaming: 'Peak: 6-10 PM',
      lifestyle: 'Peak: 6-8 AM, 7-9 PM',
      technology: 'Peak: 9-11 AM, 2-4 PM',
      sports: 'Peak: 6-9 PM',
      music: 'Peak: 4-6 PM, 8-10 PM'
    };

    return timeframes[category as keyof typeof timeframes] || 'Peak: 7-9 PM';
  }
}

// Create and export singleton instance
export const trendingService = new TrendingService();
export default trendingService;
