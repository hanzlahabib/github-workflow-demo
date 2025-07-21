import type { ContentItem, ContentConfiguration } from './contentService';

export interface PerformancePredictionRequest {
  items: ContentItem[];
  configuration: ContentConfiguration;
  targetPlatforms: string[];
  publishingSchedule?: {
    platform: string;
    scheduledTime: string;
  }[];
}

export interface PlatformPrediction {
  platform: string;
  expectedViews: string;
  expectedEngagement: string;
  expectedShares: string;
  viralChance: number;
  bestPostTime: string;
  demographicReach: string;
  competitionLevel: 'low' | 'medium' | 'high';
  recommendedHashtags: string[];
  estimatedRevenue?: string;
}

export interface PerformancePredictionResult {
  predictions: PlatformPrediction[];
  overallViralScore: number;
  crossPlatformSynergy: number;
  recommendedStrategy: string[];
  riskFactors: string[];
  successProbability: number;
  timeline: {
    phase: string;
    duration: string;
    expectedResults: string;
  }[];
}

export interface CompetitorAnalysisRequest {
  topic: string;
  category: string;
  platform: string;
  timeframe?: '7d' | '30d' | '90d';
}

export interface CompetitorProfile {
  name: string;
  viralScore: number;
  avgViews: string;
  contentStyle: string;
  strengths: string[];
  weaknesses: string[];
  frequency: string;
  engagement: string;
}

export interface CompetitorAnalysisResult {
  competitors: CompetitorProfile[];
  marketGap: string;
  opportunities: string[];
  threats: string[];
  recommendedDifferentiation: string[];
  competitiveAdvantage: string;
  marketSaturation: number;
}

export class PerformanceService {
  /**
   * Predict performance metrics across multiple platforms
   */
  async predictPerformance(request: PerformancePredictionRequest): Promise<PerformancePredictionResult> {
    const { items, configuration, targetPlatforms, publishingSchedule } = request;

    // Simulate prediction analysis
    await new Promise(resolve => setTimeout(resolve, 1800));

    const baseViralScore = this.calculateBaseViralScore(items, configuration);
    const predictions = await this.generatePlatformPredictions(targetPlatforms, baseViralScore, items);

    const crossPlatformSynergy = this.calculateCrossPlatformSynergy(targetPlatforms);
    const successProbability = this.calculateSuccessProbability(baseViralScore, crossPlatformSynergy);

    return {
      predictions,
      overallViralScore: baseViralScore,
      crossPlatformSynergy,
      recommendedStrategy: this.generateRecommendedStrategy(predictions),
      riskFactors: this.generateRiskFactors(targetPlatforms, baseViralScore),
      successProbability,
      timeline: this.generateTimeline(targetPlatforms)
    };
  }

  /**
   * Analyze competitors in the same space
   */
  async analyzeCompetitors(request: CompetitorAnalysisRequest): Promise<CompetitorAnalysisResult> {
    const { topic, category, platform, timeframe = '30d' } = request;

    // Simulate competitor analysis
    await new Promise(resolve => setTimeout(resolve, 2500));

    const competitors = this.generateCompetitorProfiles(category, platform);
    const marketAnalysis = this.analyzeMarketConditions(category, platform, competitors);

    return {
      competitors,
      marketGap: marketAnalysis.gap,
      opportunities: marketAnalysis.opportunities,
      threats: marketAnalysis.threats,
      recommendedDifferentiation: this.generateDifferentiationStrategy(competitors, category),
      competitiveAdvantage: this.identifyCompetitiveAdvantage(category, platform),
      marketSaturation: marketAnalysis.saturation
    };
  }

  /**
   * Complete market position analysis
   */
  async analyzeMarketPosition(topic: string, category: string, platforms: string[]) {
    const competitorAnalyses = await Promise.all(
      platforms.map(platform =>
        this.analyzeCompetitors({ topic, category, platform })
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

  private extractCombinedOpportunities(analyses: any[]): string[] {
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

  private generateStrategicRecommendations(analyses: any[], platforms: string[]): string[] {
    return [
      'Focus on underserved demographics across all platforms',
      'Develop platform-specific content variations',
      'Create series-based content for sustained engagement',
      'Leverage cross-platform synergies for maximum reach',
      'Monitor competitor activities and adapt quickly'
    ];
  }

  /**
   * Calculate engagement metrics for specific content
   */
  calculateEngagementMetrics(
    views: number,
    platform: string,
    contentType: 'top5' | 'countdown' | 'list'
  ): {
    expectedLikes: number;
    expectedComments: number;
    expectedShares: number;
    engagementRate: number;
  } {
    const platformMetrics = {
      tiktok: { likes: 0.08, comments: 0.02, shares: 0.05, baseRate: 0.15 },
      instagram: { likes: 0.06, comments: 0.015, shares: 0.03, baseRate: 0.105 },
      youtube: { likes: 0.04, comments: 0.01, shares: 0.02, baseRate: 0.07 },
      twitter: { likes: 0.05, comments: 0.008, shares: 0.025, baseRate: 0.083 },
      facebook: { likes: 0.035, comments: 0.005, shares: 0.015, baseRate: 0.055 }
    };

    const metrics = platformMetrics[platform.toLowerCase() as keyof typeof platformMetrics] ||
                   platformMetrics.instagram;

    // Content type multipliers
    const contentMultipliers = {
      top5: 1.2,
      countdown: 1.35,
      list: 1.0
    };

    const multiplier = contentMultipliers[contentType];

    return {
      expectedLikes: Math.floor(views * metrics.likes * multiplier),
      expectedComments: Math.floor(views * metrics.comments * multiplier),
      expectedShares: Math.floor(views * metrics.shares * multiplier),
      engagementRate: metrics.baseRate * multiplier
    };
  }

  /**
   * Optimize posting schedule across platforms
   */
  optimizePostingSchedule(platforms: string[], timezone: string = 'UTC'): {
    platform: string;
    optimalTime: string;
    reason: string;
  }[] {
    const optimalTimes = {
      tiktok: { time: '19:00', reason: 'Peak engagement during evening entertainment hours' },
      instagram: { time: '18:00', reason: 'Maximum reach during post-work social browsing' },
      youtube: { time: '20:00', reason: 'Prime time for video consumption' },
      twitter: { time: '12:00', reason: 'Lunch break peak activity period' },
      facebook: { time: '14:00', reason: 'Afternoon social media check-ins' }
    };

    return platforms.map(platform => ({
      platform,
      optimalTime: optimalTimes[platform.toLowerCase() as keyof typeof optimalTimes]?.time || '19:00',
      reason: optimalTimes[platform.toLowerCase() as keyof typeof optimalTimes]?.reason || 'General peak hours'
    }));
  }

  private calculateBaseViralScore(items: ContentItem[], configuration: ContentConfiguration): number {
    let score = 50;

    // Content quality factors
    const avgTitleLength = items.reduce((sum, item) => sum + item.title.length, 0) / items.length;
    if (avgTitleLength >= 20 && avgTitleLength <= 60) score += 15;

    // Emotional triggers
    const hasEmotionalWords = items.some(item =>
      /amazing|incredible|shocking|unbelievable|stunning|mind-blowing|insane/i.test(item.title)
    );
    if (hasEmotionalWords) score += 20;

    // Numbers and specificity
    const hasNumbers = items.some(item => /\d+/.test(item.title));
    if (hasNumbers) score += 10;

    // Configuration factors
    if (configuration.countdownDirection === 'descending') score += 12;
    if (configuration.itemCount === 5) score += 8;
    if (configuration.displayDuration >= 6000 && configuration.displayDuration <= 10000) score += 5;

    return Math.min(score, 100);
  }

  private async generatePlatformPredictions(
    platforms: string[],
    baseViralScore: number,
    items: ContentItem[]
  ): Promise<PlatformPrediction[]> {
    const baseViews = 50000;

    return platforms.map(platform => {
      const platformMultiplier = this.getPlatformMultiplier(platform);
      const viralMultiplier = (baseViralScore / 100) * 3 + 1;

      const expectedViews = Math.floor(baseViews * viralMultiplier * platformMultiplier);
      const engagementMetrics = this.calculateEngagementMetrics(expectedViews, platform, 'top5');

      return {
        platform,
        expectedViews: this.formatNumber(expectedViews),
        expectedEngagement: this.formatNumber(engagementMetrics.expectedLikes + engagementMetrics.expectedComments),
        expectedShares: this.formatNumber(engagementMetrics.expectedShares),
        viralChance: Math.min(baseViralScore + this.getPlatformBonus(platform), 100),
        bestPostTime: this.getPlatformOptimalTime(platform),
        demographicReach: this.getPlatformDemographics(platform),
        competitionLevel: this.getCompetitionLevel(platform),
        recommendedHashtags: this.getRecommendedHashtags(platform, items),
        estimatedRevenue: this.estimateRevenue(expectedViews, platform)
      };
    });
  }

  private getPlatformMultiplier(platform: string): number {
    const multipliers = {
      tiktok: 2.8,
      instagram: 2.2,
      youtube: 1.9,
      twitter: 1.6,
      facebook: 1.4,
      linkedin: 1.0,
      pinterest: 1.3
    };

    return multipliers[platform.toLowerCase() as keyof typeof multipliers] || 1.0;
  }

  private getPlatformBonus(platform: string): number {
    const bonuses = {
      tiktok: 15,
      instagram: 10,
      youtube: 8,
      twitter: 5,
      facebook: 3
    };

    return bonuses[platform.toLowerCase() as keyof typeof bonuses] || 0;
  }

  private getPlatformOptimalTime(platform: string): string {
    const times = {
      tiktok: '7-9 PM',
      instagram: '6-8 PM',
      youtube: '8-10 PM',
      twitter: '12-1 PM, 5-6 PM',
      facebook: '1-3 PM',
      linkedin: '8-10 AM, 5-6 PM',
      pinterest: '8-11 PM'
    };

    return times[platform.toLowerCase() as keyof typeof times] || '7-9 PM';
  }

  private getPlatformDemographics(platform: string): string {
    const demographics = {
      tiktok: 'Gen Z (13-24)',
      instagram: 'Millennials (25-34)',
      youtube: 'Mixed (18-45)',
      twitter: 'Adults (25-40)',
      facebook: 'Adults (30-50)',
      linkedin: 'Professionals (25-55)',
      pinterest: 'Women (25-45)'
    };

    return demographics[platform.toLowerCase() as keyof typeof demographics] || 'General Audience';
  }

  private getCompetitionLevel(platform: string): 'low' | 'medium' | 'high' {
    const competitionLevels = {
      tiktok: 'high' as const,
      instagram: 'high' as const,
      youtube: 'medium' as const,
      twitter: 'medium' as const,
      facebook: 'low' as const,
      linkedin: 'low' as const,
      pinterest: 'medium' as const
    };

    return competitionLevels[platform.toLowerCase() as keyof typeof competitionLevels] || 'medium';
  }

  private getRecommendedHashtags(platform: string, items: ContentItem[]): string[] {
    const platformTags = {
      tiktok: ['#fyp', '#viral', '#trending', '#top5', '#countdown'],
      instagram: ['#viral', '#trending', '#top5list', '#countdown', '#explore'],
      youtube: ['#Top5', '#Countdown', '#Viral', '#Trending', '#MustWatch'],
      twitter: ['#Top5', '#Thread', '#Viral', '#Trending'],
      facebook: ['#Top5', '#List', '#MustSee', '#Trending']
    };

    const baseTags = platformTags[platform.toLowerCase() as keyof typeof platformTags] || ['#Top5', '#Viral'];

    // Add content-specific tags from items
    const contentTags = items.flatMap(item => item.contentTags || [])
      .filter((tag, index, array) => array.indexOf(tag) === index)
      .slice(0, 3)
      .map(tag => `#${tag}`);

    return [...baseTags, ...contentTags].slice(0, 8);
  }

  private estimateRevenue(views: number, platform: string): string {
    const revenueRates = {
      tiktok: 0.02,
      instagram: 0.015,
      youtube: 0.01,
      twitter: 0.005,
      facebook: 0.008
    };

    const rate = revenueRates[platform.toLowerCase() as keyof typeof revenueRates] || 0.01;
    const revenue = views * rate;

    return this.formatCurrency(revenue);
  }

  private calculateCrossPlatformSynergy(platforms: string[]): number {
    if (platforms.length === 1) return 70;
    if (platforms.length === 2) return 80;
    if (platforms.length >= 3) return 90;
    return 75;
  }

  private calculateSuccessProbability(viralScore: number, synergy: number): number {
    return Math.min(Math.floor((viralScore * 0.7) + (synergy * 0.3)), 100);
  }

  private generateRecommendedStrategy(predictions: PlatformPrediction[]): string[] {
    const sortedPredictions = predictions.sort((a, b) => b.viralChance - a.viralChance);
    const topPlatform = sortedPredictions[0];

    return [
      `Post on ${topPlatform.platform} first for maximum viral potential`,
      `Cross-post to other platforms within 2-4 hours`,
      `Use platform-specific hashtags and optimize for each audience`,
      `Engage with comments in first 30 minutes to boost algorithm visibility`,
      `Monitor performance and adjust posting times based on engagement`,
      `Create platform-specific variations (shorter for TikTok, longer for YouTube)`
    ];
  }

  private generateRiskFactors(platforms: string[], viralScore: number): string[] {
    const commonRisks = [
      'Algorithm changes may affect organic reach',
      'High competition in Top 5 list format',
      'Trending topics have short lifespan'
    ];

    if (viralScore < 70) {
      commonRisks.push('Content may not be engaging enough for viral spread');
    }

    if (platforms.includes('tiktok')) {
      commonRisks.push('TikTok algorithm heavily favors original audio and trends');
    }

    if (platforms.length > 3) {
      commonRisks.push('Managing multiple platforms may dilute focus and quality');
    }

    return commonRisks;
  }

  private generateTimeline(platforms: string[]): {
    phase: string;
    duration: string;
    expectedResults: string;
  }[] {
    return [
      {
        phase: 'Initial Launch',
        duration: '0-2 hours',
        expectedResults: 'Early engagement from followers, algorithm detection'
      },
      {
        phase: 'Momentum Building',
        duration: '2-24 hours',
        expectedResults: 'Increased reach, shares start multiplying'
      },
      {
        phase: 'Viral Potential',
        duration: '1-3 days',
        expectedResults: 'Cross-platform sharing, mainstream pickup'
      },
      {
        phase: 'Peak Performance',
        duration: '3-7 days',
        expectedResults: 'Maximum reach and engagement achieved'
      },
      {
        phase: 'Sustained Interest',
        duration: '1-2 weeks',
        expectedResults: 'Continued engagement, derivative content creation'
      }
    ];
  }

  private generateCompetitorProfiles(category: string, platform: string): CompetitorProfile[] {
    const profileTemplates = {
      entertainment: [
        {
          name: 'ViralCountdown',
          viralScore: 94,
          avgViews: '3.2M',
          contentStyle: 'High-energy, dramatic reveals',
          strengths: ['Perfect timing', 'Engaging thumbnails', 'Cliffhanger endings'],
          weaknesses: ['Repetitive format', 'Click-bait tendencies'],
          frequency: 'Daily',
          engagement: '8.5%'
        },
        {
          name: 'Top5Master',
          viralScore: 91,
          avgViews: '2.8M',
          contentStyle: 'Professional, well-researched',
          strengths: ['Quality research', 'Consistent posting', 'Great production'],
          weaknesses: ['Slower growth', 'Less viral moments'],
          frequency: '3x/week',
          engagement: '7.2%'
        }
      ],
      technology: [
        {
          name: 'TechCountdown',
          viralScore: 89,
          avgViews: '1.9M',
          contentStyle: 'Tech-focused, data-driven',
          strengths: ['Technical accuracy', 'Early trend adoption', 'Expert opinions'],
          weaknesses: ['Niche audience', 'Complex topics'],
          frequency: '4x/week',
          engagement: '6.8%'
        }
      ]
    };

    return profileTemplates[category as keyof typeof profileTemplates] || profileTemplates.entertainment;
  }

  private analyzeMarketConditions(
    category: string,
    platform: string,
    competitors: CompetitorProfile[]
  ): {
    gap: string;
    opportunities: string[];
    threats: string[];
    saturation: number;
  } {
    const avgViralScore = competitors.reduce((sum, comp) => sum + comp.viralScore, 0) / competitors.length;

    return {
      gap: 'Authentic, educational content with high viral appeal',
      opportunities: [
        'Underserved demographic segments',
        'Cross-platform content series',
        'Interactive and community-driven content',
        'Real-time trending topic coverage',
        'Multi-language content expansion'
      ],
      threats: [
        'Market saturation in popular categories',
        'Platform algorithm changes',
        'Increased competition from established creators',
        'Audience attention span decreasing',
        'Content copyright and fair use issues'
      ],
      saturation: Math.min(avgViralScore, 85)
    };
  }

  private generateDifferentiationStrategy(competitors: CompetitorProfile[], category: string): string[] {
    return [
      'Develop unique visual style and branding',
      'Focus on underexplored subtopics within category',
      'Create interactive elements and audience participation',
      'Establish consistent posting schedule with quality over quantity',
      'Build community through behind-the-scenes content',
      'Collaborate with other creators for cross-pollination',
      'Leverage real-time events and trending topics',
      'Develop signature format or catchphrase'
    ];
  }

  private identifyCompetitiveAdvantage(category: string, platform: string): string {
    return 'AI-powered content optimization combined with authentic storytelling and data-driven insights';
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  private formatCurrency(amount: number): string {
    return '$' + this.formatNumber(amount);
  }
}

// Create and export singleton instance
export const performanceService = new PerformanceService();
export default performanceService;
