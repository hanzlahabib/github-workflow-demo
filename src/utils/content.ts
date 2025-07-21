/**
 * Utility functions for content generation, optimization, and analysis
 */

export interface ContentTag {
  tag: string;
  category: string;
  popularity: number;
  platforms: string[];
}

export interface ViralAnalysisResult {
  overallScore: number;
  factors: {
    titleOptimization: number;
    emotionalImpact: number;
    trendinessScore: number;
    platformFit: number;
    audienceAlignment: number;
  };
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

/**
 * Generate content tags based on category and topic
 * @param category - Content category
 * @param topic - Main topic or keywords
 * @returns Array of relevant tags
 */
export function generateContentTags(category: string, topic: string = ''): string[] {
  const baseTags = ['viral', 'trending', 'engaging'];

  const categoryTags: Record<string, string[]> = {
    'entertainment': ['celebrity', 'movies', 'tv', 'drama', 'fun', 'amazing'],
    'technology': ['ai', 'tech', 'innovation', 'future', 'gadgets', 'software'],
    'lifestyle': ['health', 'wellness', 'tips', 'life', 'daily', 'habits'],
    'gaming': ['gaming', 'esports', 'streamer', 'gameplay', 'review', 'tutorial'],
    'education': ['learn', 'education', 'tips', 'howto', 'guide', 'tutorial'],
    'business': ['entrepreneur', 'business', 'success', 'money', 'startup', 'finance'],
    'sports': ['sports', 'fitness', 'athlete', 'competition', 'training', 'health'],
    'music': ['music', 'artist', 'song', 'album', 'concert', 'performance'],
    'food': ['food', 'recipe', 'cooking', 'restaurant', 'chef', 'delicious'],
    'travel': ['travel', 'destination', 'adventure', 'explore', 'vacation', 'culture'],
    'news': ['news', 'current', 'update', 'breaking', 'politics', 'world'],
    'comedy': ['funny', 'comedy', 'humor', 'joke', 'laugh', 'meme'],
    'fashion': ['fashion', 'style', 'outfit', 'trend', 'designer', 'beauty'],
    'science': ['science', 'research', 'discovery', 'experiment', 'facts', 'study']
  };

  const tags = [...baseTags];

  // Add category-specific tags
  if (categoryTags[category.toLowerCase()]) {
    tags.push(...categoryTags[category.toLowerCase()]);
  }

  // Add topic-derived tags
  if (topic) {
    const topicWords = topic.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    tags.push(...topicWords.slice(0, 3)); // Add first 3 relevant words
  }

  return [...new Set(tags)].slice(0, 8); // Remove duplicates and limit to 8 tags
}

/**
 * Generate hashtags for social media platforms
 * @param topic - Main topic
 * @param style - Content style (informative, controversial, funny, etc.)
 * @param platform - Target platform (optional)
 * @returns Array of hashtags
 */
export function generateHashtags(topic: string, style: string = 'informative', platform: string = 'general'): string[] {
  const baseHashtags = ['#viral', '#trending'];

  // Topic-based hashtags
  const topicHashtags = topic.split(' ')
    .filter(word => word.length > 2)
    .map(word => `#${word.toLowerCase().replace(/[^a-z0-9]/g, '')}`)
    .slice(0, 3);

  // Style-based hashtags
  const styleHashtags: Record<string, string[]> = {
    'informative': ['#education', '#facts', '#learning', '#knowledge'],
    'controversial': ['#debate', '#opinion', '#hottake', '#discussion'],
    'funny': ['#humor', '#comedy', '#memes', '#laugh'],
    'inspirational': ['#motivation', '#inspiration', '#mindset', '#success'],
    'dramatic': ['#drama', '#shocking', '#intense', '#emotional'],
    'educational': ['#tutorial', '#howto', '#guide', '#tips']
  };

  // Platform-specific hashtags
  const platformHashtags: Record<string, string[]> = {
    'tiktok': ['#fyp', '#foryou', '#tiktok'],
    'instagram': ['#instagood', '#photooftheday', '#instagram'],
    'twitter': ['#twitter', '#tweet'],
    'youtube': ['#youtube', '#video', '#subscribe'],
    'linkedin': ['#linkedin', '#professional', '#career']
  };

  const hashtags = [
    ...baseHashtags,
    ...topicHashtags,
    ...(styleHashtags[style.toLowerCase()] || styleHashtags['informative']).slice(0, 2)
  ];

  if (platform !== 'general' && platformHashtags[platform.toLowerCase()]) {
    hashtags.push(...platformHashtags[platform.toLowerCase()].slice(0, 2));
  }

  return [...new Set(hashtags)].slice(0, 8);
}

/**
 * Generate recommended strategy for content distribution
 * @param platforms - Array of target platforms
 * @param contentType - Type of content
 * @param predictions - Performance predictions (optional)
 * @returns Array of strategy recommendations
 */
export function generateRecommendedStrategy(platforms: string[], contentType: string = 'video', predictions?: any[]): string[] {
  const baseStrategy = [
    '⏰ Post during peak hours for your target audience',
    '💬 Engage with comments in the first 30 minutes',
    '📊 Monitor performance metrics closely'
  ];

  const contentStrategies: Record<string, string[]> = {
    'video': [
      '🎬 Create compelling thumbnails',
      '🔊 Use trending audio/music',
      '📱 Optimize for mobile viewing'
    ],
    'text': [
      '📝 Use engaging hooks in first line',
      '🧵 Consider thread format for longer content',
      '💭 Ask questions to encourage responses'
    ],
    'image': [
      '🖼️ Use high-quality visuals',
      '🎨 Maintain consistent brand aesthetics',
      '📸 Add alt text for accessibility'
    ]
  };

  const platformStrategies: Record<string, string[]> = {
    'tiktok': [
      '🎵 Use trending sounds',
      '✨ Add engaging visual effects',
      '🏷️ Participate in trending challenges'
    ],
    'instagram': [
      '📱 Create Stories and Highlights',
      '🏷️ Use relevant location tags',
      '🛍️ Utilize Shopping features if applicable'
    ],
    'youtube': [
      '🎯 Optimize titles and descriptions for SEO',
      '📋 Add to relevant playlists',
      '🔔 Remind viewers to subscribe'
    ],
    'twitter': [
      '🧵 Create engaging thread summaries',
      '📊 Use polls for interaction',
      '🔄 Retweet with additional context'
    ]
  };

  const strategy = [...baseStrategy];

  // Add content-specific strategies
  if (contentStrategies[contentType]) {
    strategy.push(...contentStrategies[contentType]);
  }

  // Add platform-specific strategies
  platforms.forEach(platform => {
    if (platformStrategies[platform.toLowerCase()]) {
      strategy.push(...platformStrategies[platform.toLowerCase()].slice(0, 2));
    }
  });

  // Add cross-platform strategy if multiple platforms
  if (platforms.length > 1) {
    strategy.push(
      '📱 Adapt content format for each platform',
      '🔄 Cross-promote between platforms',
      '⏱️ Stagger posting times across platforms'
    );
  }

  return [...new Set(strategy)].slice(0, 10);
}

/**
 * Generate risk factors for content strategy
 * @param platforms - Target platforms
 * @param contentType - Type of content
 * @param topic - Content topic
 * @returns Array of potential risk factors
 */
export function generateRiskFactors(platforms: string[] = [], contentType: string = '', topic: string = ''): string[] {
  const generalRisks = [
    'Algorithm changes may affect reach',
    'Trending topics have short lifespan',
    'High competition in popular niches',
    'Audience fatigue with repetitive content'
  ];

  const contentRisks: Record<string, string[]> = {
    'controversial': [
      'Potential backlash from sensitive topics',
      'Platform policy violations possible',
      'Brand safety concerns'
    ],
    'trending': [
      'Trend may die quickly',
      'Market oversaturation',
      'Late adoption penalties'
    ],
    'educational': [
      'Fact-checking requirements',
      'Expert credibility needed',
      'Longer engagement cycles'
    ],
    'comedy': [
      'Humor subjectivity',
      'Cultural sensitivity issues',
      'Joke fatigue'
    ]
  };

  const platformRisks: Record<string, string[]> = {
    'tiktok': ['Fast trend cycles', 'Young audience preferences'],
    'youtube': ['Long production times', 'SEO dependency'],
    'twitter': ['Character limitations', 'Real-time expectations'],
    'instagram': ['Visual quality standards', 'Story expiration']
  };

  const risks = [...generalRisks];

  // Add content-specific risks
  Object.keys(contentRisks).forEach(riskType => {
    if (topic.toLowerCase().includes(riskType) || contentType.toLowerCase().includes(riskType)) {
      risks.push(...contentRisks[riskType]);
    }
  });

  // Add platform-specific risks
  platforms.forEach(platform => {
    if (platformRisks[platform.toLowerCase()]) {
      risks.push(...platformRisks[platform.toLowerCase()]);
    }
  });

  return [...new Set(risks)].slice(0, 6);
}

/**
 * Analyze content for viral potential
 * @param content - Content to analyze (title, description, etc.)
 * @param category - Content category
 * @param targetPlatforms - Target platforms
 * @returns Viral analysis result
 */
export function analyzeViralPotential(
  content: { title?: string; description?: string; tags?: string[] },
  category: string,
  targetPlatforms: string[] = []
): ViralAnalysisResult {
  let score = 50; // Base score
  const suggestions: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Analyze title
  if (content.title) {
    const title = content.title.toLowerCase();
    const titleLength = content.title.length;

    if (titleLength >= 20 && titleLength <= 60) {
      score += 10;
      strengths.push('Optimal title length');
    } else if (titleLength < 20) {
      suggestions.push('Make title more descriptive (20-60 characters optimal)');
      weaknesses.push('Title too short');
    } else {
      suggestions.push('Shorten title for better engagement');
      weaknesses.push('Title too long');
    }

    // Check for emotional triggers
    const emotionalWords = ['amazing', 'incredible', 'shocking', 'unbelievable', 'stunning', 'secret', 'revealed'];
    if (emotionalWords.some(word => title.includes(word))) {
      score += 15;
      strengths.push('Strong emotional appeal');
    } else {
      suggestions.push('Add emotional triggers (amazing, incredible, shocking)');
    }

    // Check for action words
    const actionWords = ['breaking', 'revealed', 'exposed', 'discovered', 'ultimate', 'essential'];
    if (actionWords.some(word => title.includes(word))) {
      score += 10;
      strengths.push('Compelling action words');
    }

    // Check for numbers
    if (/\d/.test(title)) {
      score += 5;
      strengths.push('Numbers in title increase clarity');
    }
  }

  // Analyze description
  if (content.description) {
    const descLength = content.description.length;
    if (descLength >= 100 && descLength <= 300) {
      score += 8;
      strengths.push('Good description length');
    } else if (descLength < 100) {
      suggestions.push('Add more context in description');
    }
  }

  // Analyze tags
  if (content.tags && content.tags.length > 0) {
    if (content.tags.length >= 3 && content.tags.length <= 8) {
      score += 5;
      strengths.push('Appropriate number of tags');
    } else if (content.tags.length < 3) {
      suggestions.push('Add more relevant tags for better discovery');
    } else {
      suggestions.push('Reduce tags to avoid looking spammy');
    }
  }

  // Platform optimization
  if (targetPlatforms.length > 0) {
    score += 3;
    strengths.push('Multi-platform strategy');
  }

  // Category factors
  const highViralCategories = ['entertainment', 'comedy', 'drama', 'controversy'];
  if (highViralCategories.includes(category.toLowerCase())) {
    score += 8;
    strengths.push('High-viral category');
  }

  // Ensure score is within bounds
  score = Math.min(Math.max(score, 0), 100);

  return {
    overallScore: score,
    factors: {
      titleOptimization: Math.min(score + 5, 100),
      emotionalImpact: Math.min(score + 8, 100),
      trendinessScore: Math.min(score - 5, 100),
      platformFit: Math.min(score + 2, 100),
      audienceAlignment: Math.min(score + 3, 100)
    },
    suggestions,
    strengths,
    weaknesses
  };
}

/**
 * Generate content improvements based on analysis
 * @param analysis - Viral analysis result
 * @param contentType - Type of content
 * @returns Array of specific improvement suggestions
 */
export function generateContentImprovements(analysis: ViralAnalysisResult, contentType: string = 'general'): string[] {
  const improvements: string[] = [];

  if (analysis.overallScore < 60) {
    improvements.push('Focus on creating more engaging hooks');
    improvements.push('Research trending topics in your niche');
  }

  if (analysis.overallScore < 70) {
    improvements.push('Add more emotional language and storytelling');
    improvements.push('Include call-to-action elements');
  }

  if (analysis.factors.titleOptimization < 70) {
    improvements.push('Optimize title with power words and numbers');
    improvements.push('A/B test different title variations');
  }

  if (analysis.factors.emotionalImpact < 60) {
    improvements.push('Increase emotional connection with audience');
    improvements.push('Use more vivid and descriptive language');
  }

  // Content-specific improvements
  const contentImprovements: Record<string, string[]> = {
    'video': [
      'Improve thumbnail design',
      'Add captions for accessibility',
      'Use better lighting and audio quality'
    ],
    'text': [
      'Break up long paragraphs',
      'Use bullet points for key information',
      'Add relevant emojis for engagement'
    ],
    'image': [
      'Increase image resolution and quality',
      'Use consistent brand colors',
      'Add text overlay for context'
    ]
  };

  if (contentImprovements[contentType]) {
    improvements.push(...contentImprovements[contentType].slice(0, 2));
  }

  return [...new Set(improvements)].slice(0, 8);
}

/**
 * Calculate monetization potential based on content metrics
 * @param metrics - Content performance metrics
 * @param platforms - Target platforms
 * @returns Monetization analysis
 */
export function calculateMonetizationPotential(
  metrics: { views?: number; engagement?: number; followers?: number },
  platforms: string[] = []
) {
  const avgViews = metrics.views || 0;
  const engagementRate = metrics.engagement ? (metrics.engagement / avgViews) * 100 : 5;

  // Platform-specific CPM rates (example values)
  const cpmRates: Record<string, number> = {
    'youtube': 2.0,
    'instagram': 1.8,
    'tiktok': 1.2,
    'twitter': 1.5,
    'facebook': 1.6
  };

  const avgCpm = platforms.length > 0
    ? platforms.reduce((sum, platform) => sum + (cpmRates[platform.toLowerCase()] || 1.5), 0) / platforms.length
    : 1.5;

  const adRevenue = (avgViews * avgCpm / 1000).toFixed(2);
  const sponsorshipValue = (avgViews * 3 / 1000).toFixed(2);

  let affiliateOpportunity = 'Low';
  if (avgViews > 100000) affiliateOpportunity = 'High';
  else if (avgViews > 50000) affiliateOpportunity = 'Medium';

  const influencerRate = (avgViews / 1000 * 0.5).toFixed(2);

  return {
    adRevenue: `$${adRevenue}`,
    sponsorshipValue: `$${sponsorshipValue}`,
    affiliateOpportunity,
    influencerRate: `$${influencerRate} per 1K followers`,
    engagementRate: `${engagementRate.toFixed(1)}%`,
    monetizationScore: Math.min(Math.floor((avgViews / 10000) * 10 + engagementRate), 100)
  };
}
