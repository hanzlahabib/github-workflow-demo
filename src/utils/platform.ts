/**
 * Utility functions for platform-specific optimizations and data
 */

export type PlatformType = 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'linkedin' | 'twitch';

/**
 * Get optimal posting time for each platform
 * @param platform - The platform to get optimal time for
 * @returns Optimal posting time string
 */
export function getPlatformOptimalTime(platform: string): string {
  const platformTimes: Record<string, string> = {
    'tiktok': '7-9 PM',
    'instagram': '6-8 PM',
    'youtube': '8-10 PM',
    'twitter': '9-10 AM, 12-1 PM, 5-6 PM',
    'facebook': '1-3 PM',
    'linkedin': '8-10 AM, 12-2 PM',
    'twitch': '8-11 PM'
  };

  return platformTimes[platform.toLowerCase()] || '7-9 PM';
}

/**
 * Get platform-specific demographics
 * @param platform - The platform to get demographics for
 * @returns Demographics string
 */
export function getPlatformDemographics(platform: string): string {
  const demographicsMap: Record<string, string> = {
    'tiktok': 'Gen Z (13-24)',
    'instagram': 'Millennials (25-34)',
    'youtube': 'Mixed (18-45)',
    'twitter': 'Adults (25-40)',
    'facebook': 'Adults (30-50)',
    'linkedin': 'Professionals (25-45)',
    'twitch': 'Gamers (16-34)'
  };

  return demographicsMap[platform.toLowerCase()] || 'General Audience';
}

/**
 * Get platform-specific content recommendations
 * @param platform - The platform to get recommendations for
 * @param contentType - Type of content (optional)
 * @returns Array of recommendation strings
 */
export function getPlatformContentRecommendations(platform: string, contentType?: string): string[] {
  const recommendationsMap: Record<string, string[]> = {
    'tiktok': [
      'Add visual elements and animations',
      'Use trending sounds and music',
      'Create short-form video versions',
      'Add captions for accessibility',
      'Use popular effects and filters'
    ],
    'instagram': [
      'Create carousel posts with multiple slides',
      'Use Instagram Stories and Highlights',
      'Add location tags and hashtags',
      'Create Reels versions',
      'Use Instagram Shopping features'
    ],
    'youtube': [
      'Create video essay versions',
      'Add to relevant playlists',
      'Use SEO-friendly titles and descriptions',
      'Create thumbnail designs',
      'Add end screens and cards'
    ],
    'twitter': [
      'Use Twitter polls for engagement',
      'Create thread summaries',
      'Engage with trending hashtags',
      'Use Twitter Spaces for discussions',
      'Pin important tweets'
    ],
    'facebook': [
      'Create longer-form content',
      'Use Facebook Groups',
      'Add call-to-action buttons',
      'Use Facebook Events',
      'Create Facebook Stories'
    ],
    'linkedin': [
      'Focus on professional insights',
      'Use LinkedIn Articles',
      'Engage with industry groups',
      'Share behind-the-scenes content',
      'Use professional hashtags'
    ]
  };

  return recommendationsMap[platform.toLowerCase()] || recommendationsMap['twitter'];
}

/**
 * Get platform-specific risk factors
 * @param platform - The platform to get risk factors for
 * @returns Array of risk factor strings
 */
export function getPlatformRiskFactors(platform: string): string[] {
  const riskFactorsMap: Record<string, string[]> = {
    'tiktok': [
      'Fast-moving trends',
      'Algorithm volatility',
      'Content lifespan is short',
      'High competition'
    ],
    'instagram': [
      'Declining organic reach',
      'Algorithm changes',
      'Story expiration',
      'Shadowbanning concerns'
    ],
    'youtube': [
      'Competition for views',
      'SEO requirements',
      'Longer production time',
      'Copyright issues'
    ],
    'twitter': [
      'Algorithm changes',
      'Tweet character limits',
      'Potential for controversy',
      'Platform policy changes'
    ],
    'facebook': [
      'Declining organic reach',
      'Algorithm changes',
      'Aging user base',
      'Ad fatigue'
    ],
    'linkedin': [
      'Professional content requirements',
      'Lower viral potential',
      'B2B focus limitations',
      'Smaller audience'
    ]
  };

  return riskFactorsMap[platform.toLowerCase()] || riskFactorsMap['twitter'];
}

/**
 * Get platform multipliers for engagement prediction
 * @param platform - The platform to get multiplier for
 * @returns Numeric multiplier for calculations
 */
export function getPlatformEngagementMultiplier(platform: string): number {
  const multiplierMap: Record<string, number> = {
    'tiktok': 2.5,
    'instagram': 2.0,
    'youtube': 1.8,
    'twitter': 1.5,
    'facebook': 1.3,
    'linkedin': 1.2,
    'twitch': 1.6
  };

  return multiplierMap[platform.toLowerCase()] || 1.0;
}

/**
 * Get platform-specific hashtag recommendations
 * @param platform - The platform to get hashtags for
 * @param category - Content category
 * @returns Array of recommended hashtags
 */
export function getPlatformHashtags(platform: string, category: string): string[] {
  const platformHashtags: Record<string, Record<string, string[]>> = {
    'tiktok': {
      'viral': ['#fyp', '#foryou', '#viral', '#trending'],
      'comedy': ['#funny', '#comedy', '#laugh', '#humor'],
      'educational': ['#learn', '#education', '#tips', '#howto'],
      'entertainment': ['#entertainment', '#fun', '#amazing', '#wow']
    },
    'instagram': {
      'viral': ['#viral', '#trending', '#explore', '#instagood'],
      'lifestyle': ['#lifestyle', '#daily', '#aesthetic', '#vibes'],
      'business': ['#entrepreneur', '#business', '#success', '#hustle'],
      'creative': ['#creative', '#art', '#design', '#inspiration']
    },
    'twitter': {
      'viral': ['#viral', '#trending', '#Twitter'],
      'tech': ['#tech', '#innovation', '#AI', '#startup'],
      'news': ['#breaking', '#news', '#update'],
      'opinion': ['#opinion', '#debate', '#discussion']
    },
    'youtube': {
      'viral': ['#viral', '#trending', '#youtube'],
      'tutorial': ['#tutorial', '#howto', '#guide', '#tips'],
      'entertainment': ['#entertainment', '#fun', '#amazing'],
      'review': ['#review', '#opinion', '#analysis']
    }
  };

  const platformData = platformHashtags[platform.toLowerCase()];
  if (!platformData) return ['#viral', '#trending'];

  return platformData[category.toLowerCase()] || platformData['viral'] || ['#viral', '#trending'];
}

/**
 * Get platform-specific optimal video dimensions
 * @param platform - The platform to get dimensions for
 * @returns Object with width, height, and aspect ratio
 */
export function getPlatformVideoDimensions(platform: string) {
  const dimensionsMap: Record<string, { width: number; height: number; aspectRatio: string }> = {
    'tiktok': { width: 1080, height: 1920, aspectRatio: '9:16' },
    'instagram': { width: 1080, height: 1920, aspectRatio: '9:16' },
    'youtube': { width: 1920, height: 1080, aspectRatio: '16:9' },
    'twitter': { width: 1280, height: 720, aspectRatio: '16:9' },
    'facebook': { width: 1920, height: 1080, aspectRatio: '16:9' },
    'linkedin': { width: 1920, height: 1080, aspectRatio: '16:9' }
  };

  return dimensionsMap[platform.toLowerCase()] || { width: 1920, height: 1080, aspectRatio: '16:9' };
}

/**
 * Get platform-specific content length recommendations
 * @param platform - The platform to get length for
 * @param contentType - Type of content (video, text, etc.)
 * @returns Object with min and max recommended lengths
 */
export function getPlatformContentLength(platform: string, contentType: 'video' | 'text' | 'title' = 'video') {
  const lengthMap: Record<string, Record<string, { min: number; max: number; optimal: number; unit: string }>> = {
    'tiktok': {
      'video': { min: 15, max: 180, optimal: 60, unit: 'seconds' },
      'text': { min: 50, max: 150, optimal: 100, unit: 'characters' },
      'title': { min: 20, max: 100, optimal: 60, unit: 'characters' }
    },
    'instagram': {
      'video': { min: 15, max: 90, optimal: 30, unit: 'seconds' },
      'text': { min: 100, max: 300, optimal: 200, unit: 'characters' },
      'title': { min: 30, max: 125, optimal: 80, unit: 'characters' }
    },
    'youtube': {
      'video': { min: 60, max: 900, optimal: 300, unit: 'seconds' },
      'text': { min: 200, max: 500, optimal: 300, unit: 'characters' },
      'title': { min: 40, max: 100, optimal: 70, unit: 'characters' }
    },
    'twitter': {
      'video': { min: 10, max: 140, optimal: 45, unit: 'seconds' },
      'text': { min: 71, max: 280, optimal: 150, unit: 'characters' },
      'title': { min: 50, max: 280, optimal: 120, unit: 'characters' }
    }
  };

  const platformData = lengthMap[platform.toLowerCase()];
  if (!platformData) {
    return { min: 30, max: 180, optimal: 90, unit: 'seconds' };
  }

  return platformData[contentType] || platformData['video'];
}

/**
 * Check if platform supports specific features
 * @param platform - The platform to check
 * @param feature - The feature to check for
 * @returns Boolean indicating feature support
 */
export function platformSupportsFeature(platform: string, feature: string): boolean {
  const featureMap: Record<string, string[]> = {
    'tiktok': ['duets', 'stitches', 'effects', 'sounds', 'hashtags', 'mentions'],
    'instagram': ['stories', 'reels', 'igtv', 'shopping', 'hashtags', 'mentions', 'location'],
    'youtube': ['playlists', 'cards', 'endscreens', 'chapters', 'premieres', 'community'],
    'twitter': ['threads', 'polls', 'spaces', 'fleets', 'hashtags', 'mentions'],
    'facebook': ['stories', 'groups', 'events', 'pages', 'marketplace', 'watch'],
    'linkedin': ['articles', 'newsletters', 'events', 'groups', 'company-pages']
  };

  const platformFeatures = featureMap[platform.toLowerCase()] || [];
  return platformFeatures.includes(feature.toLowerCase());
}
