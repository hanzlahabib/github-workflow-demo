export interface ViralTemplate {
  id: string;
  name: string;
  category: string;
  viralScore: number;
  description: string;
  preview: string;
  features: string[];
  avgEngagement: string;
  platforms: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isPremium: boolean;
  tags: string[];
  metadata: {
    createdAt: string;
    lastUpdated: string;
    usage: number;
    successRate: number;
  };
  styling: {
    colorScheme: string[];
    fontFamily: string;
    animations: string[];
    effects: string[];
  };
  configuration: {
    defaultDuration: number;
    countdownStyle: 'dramatic' | 'smooth' | 'instant';
    revealPattern: 'sequential' | 'random' | 'thematic';
    backgroundType: 'video' | 'gradient' | 'image' | 'solid';
  };
}

export interface TemplateFilter {
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  platform?: string;
  isPremium?: boolean;
  minViralScore?: number;
  sortBy?: 'viral' | 'engagement' | 'recent' | 'popularity';
}

export interface TemplateCustomization {
  templateId: string;
  colorScheme?: string[];
  fontFamily?: string;
  countdownSpeed?: number;
  backgroundImage?: string;
  musicTrack?: string;
  customAnimations?: string[];
}

export interface CustomTemplateRequest {
  name: string;
  category: string;
  baseTemplate?: string;
  styling: {
    colorScheme: string[];
    fontFamily: string;
    animations: string[];
  };
  configuration: {
    duration: number;
    countdownStyle: string;
    backgroundType: string;
  };
}

export class TemplateService {
  private static readonly VIRAL_TEMPLATES: ViralTemplate[] = [
    {
      id: 'countdown_dramatic',
      name: 'Dramatic Countdown',
      category: 'entertainment',
      viralScore: 95,
      description: 'High-impact countdown with dramatic reveals and suspenseful builds',
      preview: '🎬',
      features: ['Suspenseful builds', 'Dramatic music sync', 'Visual effects', 'Cliffhanger reveals'],
      avgEngagement: '3.2M views',
      platforms: ['TikTok', 'Instagram', 'YouTube'],
      difficulty: 'intermediate',
      isPremium: true,
      tags: ['dramatic', 'suspense', 'high-energy', 'entertainment'],
      metadata: {
        createdAt: '2024-01-15',
        lastUpdated: '2024-07-15',
        usage: 15420,
        successRate: 87
      },
      styling: {
        colorScheme: ['#FF0000', '#000000', '#FFFFFF'],
        fontFamily: 'Montserrat Bold',
        animations: ['dramatic-zoom', 'flash-reveal', 'shake-impact'],
        effects: ['spotlight', 'lens-flare', 'particle-burst']
      },
      configuration: {
        defaultDuration: 8000,
        countdownStyle: 'dramatic',
        revealPattern: 'sequential',
        backgroundType: 'video'
      }
    },
    {
      id: 'minimalist_clean',
      name: 'Clean Minimalist',
      category: 'lifestyle',
      viralScore: 88,
      description: 'Clean, modern design with smooth animations and elegant typography',
      preview: '✨',
      features: ['Smooth transitions', 'Clean typography', 'Subtle animations', 'Professional look'],
      avgEngagement: '2.1M views',
      platforms: ['Instagram', 'YouTube', 'LinkedIn'],
      difficulty: 'beginner',
      isPremium: false,
      tags: ['minimal', 'clean', 'professional', 'elegant'],
      metadata: {
        createdAt: '2024-02-01',
        lastUpdated: '2024-07-10',
        usage: 28340,
        successRate: 82
      },
      styling: {
        colorScheme: ['#FFFFFF', '#F5F5F5', '#333333'],
        fontFamily: 'Helvetica Neue',
        animations: ['fade-in', 'slide-up', 'scale-gentle'],
        effects: ['soft-shadow', 'blur-background']
      },
      configuration: {
        defaultDuration: 6000,
        countdownStyle: 'smooth',
        revealPattern: 'sequential',
        backgroundType: 'gradient'
      }
    },
    {
      id: 'neon_cyberpunk',
      name: 'Neon Cyberpunk',
      category: 'gaming',
      viralScore: 92,
      description: 'Futuristic cyberpunk aesthetic with neon effects and glitch transitions',
      preview: '🌆',
      features: ['Neon effects', 'Cyberpunk music', 'Glitch transitions', 'Futuristic UI'],
      avgEngagement: '2.8M views',
      platforms: ['TikTok', 'YouTube', 'Twitch'],
      difficulty: 'advanced',
      isPremium: true,
      tags: ['cyberpunk', 'neon', 'futuristic', 'gaming', 'tech'],
      metadata: {
        createdAt: '2024-03-10',
        lastUpdated: '2024-07-20',
        usage: 9850,
        successRate: 91
      },
      styling: {
        colorScheme: ['#00FFFF', '#FF00FF', '#000000', '#333333'],
        fontFamily: 'Orbitron',
        animations: ['glitch-effect', 'neon-pulse', 'digital-scan'],
        effects: ['hologram', 'grid-overlay', 'data-stream']
      },
      configuration: {
        defaultDuration: 7000,
        countdownStyle: 'instant',
        revealPattern: 'random',
        backgroundType: 'video'
      }
    },
    {
      id: 'retro_vintage',
      name: 'Retro Vintage',
      category: 'music',
      viralScore: 85,
      description: 'Nostalgic retro design with vintage aesthetics and classic transitions',
      preview: '📼',
      features: ['Vintage filters', 'Retro fonts', 'Classic transitions', 'Nostalgic vibes'],
      avgEngagement: '1.9M views',
      platforms: ['Instagram', 'TikTok', 'YouTube'],
      difficulty: 'beginner',
      isPremium: false,
      tags: ['retro', 'vintage', 'nostalgic', 'classic', '80s'],
      metadata: {
        createdAt: '2024-01-20',
        lastUpdated: '2024-06-30',
        usage: 22100,
        successRate: 79
      },
      styling: {
        colorScheme: ['#FFD700', '#FF6B35', '#8B4513', '#F5E6D3'],
        fontFamily: 'Courier New',
        animations: ['film-grain', 'vintage-fade', 'tape-rewind'],
        effects: ['sepia-tone', 'vignette', 'scan-lines']
      },
      configuration: {
        defaultDuration: 9000,
        countdownStyle: 'smooth',
        revealPattern: 'thematic',
        backgroundType: 'image'
      }
    },
    {
      id: 'explosive_energy',
      name: 'Explosive Energy',
      category: 'sports',
      viralScore: 94,
      description: 'High-energy template with explosive animations and dynamic effects',
      preview: '💥',
      features: ['Dynamic animations', 'Energetic music', 'Bold colors', 'Impact effects'],
      avgEngagement: '3.5M views',
      platforms: ['TikTok', 'Instagram', 'YouTube'],
      difficulty: 'intermediate',
      isPremium: true,
      tags: ['energetic', 'explosive', 'dynamic', 'sports', 'action'],
      metadata: {
        createdAt: '2024-04-05',
        lastUpdated: '2024-07-18',
        usage: 12300,
        successRate: 89
      },
      styling: {
        colorScheme: ['#FF4500', '#FFD700', '#FF1493', '#000000'],
        fontFamily: 'Impact',
        animations: ['explosion-burst', 'lightning-strike', 'energy-wave'],
        effects: ['motion-blur', 'particle-system', 'screen-shake']
      },
      configuration: {
        defaultDuration: 5000,
        countdownStyle: 'dramatic',
        revealPattern: 'random',
        backgroundType: 'video'
      }
    },
    {
      id: 'elegant_luxury',
      name: 'Elegant Luxury',
      category: 'lifestyle',
      viralScore: 87,
      description: 'Sophisticated luxury aesthetic with gold accents and smooth animations',
      preview: '👑',
      features: ['Gold accents', 'Smooth animations', 'Luxury feel', 'Premium typography'],
      avgEngagement: '2.4M views',
      platforms: ['Instagram', 'YouTube', 'LinkedIn'],
      difficulty: 'intermediate',
      isPremium: true,
      tags: ['luxury', 'elegant', 'premium', 'sophisticated', 'gold'],
      metadata: {
        createdAt: '2024-05-12',
        lastUpdated: '2024-07-22',
        usage: 8700,
        successRate: 85
      },
      styling: {
        colorScheme: ['#FFD700', '#000000', '#FFFFFF', '#C0C0C0'],
        fontFamily: 'Playfair Display',
        animations: ['elegant-slide', 'gold-shimmer', 'luxury-fade'],
        effects: ['golden-glow', 'marble-texture', 'silk-reflection']
      },
      configuration: {
        defaultDuration: 7500,
        countdownStyle: 'smooth',
        revealPattern: 'sequential',
        backgroundType: 'gradient'
      }
    }
  ];

  /**
   * Get viral templates with filtering and sorting options
   */
  getViralTemplates(filter: TemplateFilter = {}): ViralTemplate[] {
    const {
      category,
      difficulty,
      platform,
      isPremium,
      minViralScore = 0,
      sortBy = 'viral'
    } = filter;

    let filteredTemplates = [...TemplateService.VIRAL_TEMPLATES];

    // Apply filters
    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }

    if (difficulty) {
      filteredTemplates = filteredTemplates.filter(t => t.difficulty === difficulty);
    }

    if (platform) {
      filteredTemplates = filteredTemplates.filter(t =>
        t.platforms.some(p => p.toLowerCase() === platform.toLowerCase())
      );
    }

    if (isPremium !== undefined) {
      filteredTemplates = filteredTemplates.filter(t => t.isPremium === isPremium);
    }

    if (minViralScore > 0) {
      filteredTemplates = filteredTemplates.filter(t => t.viralScore >= minViralScore);
    }

    // Apply sorting
    filteredTemplates.sort((a, b) => {
      switch (sortBy) {
        case 'viral':
          return b.viralScore - a.viralScore;
        case 'engagement':
          return parseFloat(b.avgEngagement) - parseFloat(a.avgEngagement);
        case 'recent':
          return new Date(b.metadata.lastUpdated).getTime() - new Date(a.metadata.lastUpdated).getTime();
        case 'popularity':
          return b.metadata.usage - a.metadata.usage;
        default:
          return b.viralScore - a.viralScore;
      }
    });

    return filteredTemplates;
  }

  /**
   * Get template by ID
   */
  getTemplateById(templateId: string): ViralTemplate | null {
    return TemplateService.VIRAL_TEMPLATES.find(t => t.id === templateId) || null;
  }

  /**
   * Get recommended templates based on content analysis
   */
  getRecommendedTemplates(
    category: string,
    viralScore: number,
    targetPlatforms: string[],
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): ViralTemplate[] {
    const templates = this.getViralTemplates({
      category: category === 'all' ? undefined : category,
      difficulty,
      minViralScore: Math.max(viralScore - 10, 70)
    });

    // Score templates based on platform compatibility
    const scoredTemplates = templates.map(template => {
      let compatibilityScore = 0;

      targetPlatforms.forEach(platform => {
        if (template.platforms.some(p => p.toLowerCase() === platform.toLowerCase())) {
          compatibilityScore += 10;
        }
      });

      // Boost score for high-performing templates
      compatibilityScore += template.metadata.successRate * 0.5;
      compatibilityScore += (template.viralScore - 80) * 2;

      return {
        ...template,
        compatibilityScore
      };
    });

    return scoredTemplates
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 5);
  }

  /**
   * Customize a template with user preferences
   */
  customizeTemplate(templateId: string, customization: TemplateCustomization): ViralTemplate | null {
    const baseTemplate = this.getTemplateById(templateId);
    if (!baseTemplate) return null;

    const customizedTemplate: ViralTemplate = {
      ...baseTemplate,
      id: `${templateId}_custom_${Date.now()}`,
      name: `${baseTemplate.name} (Custom)`,
      styling: {
        ...baseTemplate.styling,
        ...(customization.colorScheme && { colorScheme: customization.colorScheme }),
        ...(customization.fontFamily && { fontFamily: customization.fontFamily }),
        ...(customization.customAnimations && { animations: customization.customAnimations })
      },
      configuration: {
        ...baseTemplate.configuration,
        ...(customization.countdownSpeed && { defaultDuration: customization.countdownSpeed })
      },
      metadata: {
        ...baseTemplate.metadata,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        usage: 0,
        successRate: baseTemplate.metadata.successRate
      }
    };

    return customizedTemplate;
  }

  /**
   * Create a new custom template
   */
  createCustomTemplate(request: CustomTemplateRequest): ViralTemplate {
    const templateId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: templateId,
      name: request.name,
      category: request.category,
      viralScore: 75, // Default score for new templates
      description: `Custom template: ${request.name}`,
      preview: '🎨',
      features: ['Custom styling', 'Personalized animations', 'Unique design'],
      avgEngagement: '0 views', // New template
      platforms: ['TikTok', 'Instagram', 'YouTube'], // Default platforms
      difficulty: 'intermediate',
      isPremium: false,
      tags: ['custom', request.category, 'personalized'],
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        usage: 0,
        successRate: 0
      },
      styling: {
        ...request.styling,
        effects: (request.styling as any).effects || []
      },
      configuration: request.configuration as any
    };
  }

  /**
   * Get template categories with counts
   */
  getTemplateCategories(): { category: string; count: number; avgViralScore: number }[] {
    const categoryMap = new Map<string, { count: number; totalScore: number }>();

    TemplateService.VIRAL_TEMPLATES.forEach(template => {
      const existing = categoryMap.get(template.category) || { count: 0, totalScore: 0 };
      categoryMap.set(template.category, {
        count: existing.count + 1,
        totalScore: existing.totalScore + template.viralScore
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      avgViralScore: Math.round(data.totalScore / data.count)
    }));
  }

  /**
   * Get template performance analytics
   */
  getTemplateAnalytics(templateId: string): {
    performance: {
      successRate: number;
      avgViralScore: number;
      totalUsage: number;
      platformBreakdown: { platform: string; usage: number }[];
    };
    trends: {
      monthlyUsage: { month: string; usage: number }[];
      popularModifications: string[];
    };
  } | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    // Mock analytics data - in real implementation, this would come from database
    return {
      performance: {
        successRate: template.metadata.successRate,
        avgViralScore: template.viralScore,
        totalUsage: template.metadata.usage,
        platformBreakdown: template.platforms.map((platform, index) => ({
          platform,
          usage: Math.floor(template.metadata.usage * (0.4 - index * 0.1))
        }))
      },
      trends: {
        monthlyUsage: this.generateMockMonthlyUsage(template.metadata.usage),
        popularModifications: [
          'Color scheme changes',
          'Font customization',
          'Animation speed adjustments',
          'Background modifications'
        ]
      }
    };
  }

  /**
   * Search templates by keyword
   */
  searchTemplates(query: string, filters: TemplateFilter = {}): ViralTemplate[] {
    const queryLower = query.toLowerCase();

    const matchingTemplates = TemplateService.VIRAL_TEMPLATES.filter(template => {
      const matchesName = template.name.toLowerCase().includes(queryLower);
      const matchesDescription = template.description.toLowerCase().includes(queryLower);
      const matchesTags = template.tags.some(tag => tag.toLowerCase().includes(queryLower));
      const matchesFeatures = template.features.some(feature =>
        feature.toLowerCase().includes(queryLower)
      );

      return matchesName || matchesDescription || matchesTags || matchesFeatures;
    });

    return this.getViralTemplates({ ...filters }).filter(template =>
      matchingTemplates.some(match => match.id === template.id)
    );
  }

  private generateMockMonthlyUsage(totalUsage: number): { month: string; usage: number }[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const avgMonthlyUsage = totalUsage / 6;

    return months.map(month => ({
      month,
      usage: Math.floor(avgMonthlyUsage * (0.8 + Math.random() * 0.4))
    }));
  }
}

// Create and export singleton instance
export const templateService = new TemplateService();
export default templateService;
