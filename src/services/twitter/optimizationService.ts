export function optimizeTweets(tweets: any[], threadConfiguration: any, targetPlatforms: string[]) {
  const optimizedTweets = tweets.map(tweet => {
    let optimizationScore = 60;
    const suggestions = [];

    // Content analysis
    const content = tweet.content.toLowerCase();
    const wordCount = content.split(' ').length;

    // Length optimization
    if (wordCount > 40) {
      suggestions.push('Consider shortening tweet for better engagement');
    } else if (wordCount < 10) {
      suggestions.push('Add more context to increase engagement');
    } else {
      optimizationScore += 10;
    }

    // Hashtag optimization
    const hashtagCount = (tweet.metadata?.hashtags || []).length;
    if (hashtagCount === 0) {
      suggestions.push('Add relevant hashtags for better discovery');
    } else if (hashtagCount > 3) {
      suggestions.push('Reduce hashtags to avoid looking spammy');
    } else {
      optimizationScore += 8;
    }

    // Engagement elements
    if (content.includes('?')) optimizationScore += 5;
    if (content.includes('!')) optimizationScore += 3;
    if (content.includes('thread') || content.includes('🧵')) optimizationScore += 7;

    // Viral triggers
    const viralTriggers = ['breaking', 'shocking', 'revealed', 'secret', 'truth', 'exposed'];
    if (viralTriggers.some(trigger => content.includes(trigger))) {
      optimizationScore += 12;
    }

    return {
      ...tweet,
      optimizationScore: Math.min(optimizationScore, 100),
      suggestions,
      optimizedContent: optimizeContent(tweet.content, suggestions)
    };
  });

  return {
    optimizedTweets,
    overallScore: Math.floor(optimizedTweets.reduce((sum, t) => sum + t.optimizationScore, 0) / optimizedTweets.length),
    improvements: generateOptimizationImprovements(optimizedTweets),
    platformRecommendations: generatePlatformRecommendations(targetPlatforms)
  };
}

function optimizeContent(content: string, suggestions: string[]) {
  let optimized = content;

  // Apply basic optimizations
  if (suggestions.some(s => s.includes('hashtags'))) {
    optimized += ' #trending #viral';
  }

  if (suggestions.some(s => s.includes('shorten'))) {
    optimized = optimized.substring(0, 200) + '...';
  }

  if (suggestions.some(s => s.includes('context'))) {
    optimized += '\n\nWhat are your thoughts?';
  }

  return optimized;
}

function generateOptimizationImprovements(tweets: any[]) {
  const improvements = [];

  const avgScore = tweets.reduce((sum, t) => sum + t.optimizationScore, 0) / tweets.length;

  if (avgScore < 70) {
    improvements.push('Add more engaging hooks to capture attention');
  }

  if (tweets.some(t => t.suggestions.some(s => s.includes('hashtags')))) {
    improvements.push('Optimize hashtag usage across all tweets');
  }

  if (tweets.length > 1) {
    improvements.push('Create better flow between tweets in thread');
  }

  return improvements;
}

function generatePlatformRecommendations(platforms: string[]) {
  const recommendations = {
    'twitter': ['Use Twitter-specific features like polls', 'Engage with trending topics', 'Create thread summaries'],
    'tiktok': ['Add visual elements', 'Use trending sounds', 'Create short-form versions'],
    'instagram': ['Create carousel posts', 'Use Instagram Stories', 'Add location tags'],
    'youtube': ['Create video versions', 'Add to playlists', 'Use SEO-friendly titles']
  };

  return platforms.map(platform => ({
    platform,
    recommendations: recommendations[platform] || []
  }));
}
