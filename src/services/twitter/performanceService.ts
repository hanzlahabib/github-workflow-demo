export function predictTwitterPerformance(tweets: any[], threadConfiguration: any, targetPlatforms: string[]) {
  const predictions = targetPlatforms.map(platform => {
    const platformMultiplier = {
      'twitter': 1.0,
      'tiktok': 1.8,
      'instagram': 1.5,
      'youtube': 1.3
    }[platform] || 1.0;

    const baseViews = 15000;
    const tweetCount = tweets.length;
    const avgViralScore = tweets.reduce((sum, t) => sum + (t.viralScore || 70), 0) / tweetCount;

    const expectedViews = Math.floor(baseViews * platformMultiplier * (avgViralScore / 100) * (1 + Math.random() * 0.6));
    const expectedEngagement = Math.floor(expectedViews * 0.12);
    const expectedShares = Math.floor(expectedViews * 0.08);

    return {
      platform,
      expectedViews: formatNumber(expectedViews),
      expectedEngagement: formatNumber(expectedEngagement),
      expectedShares: formatNumber(expectedShares),
      viralChance: Math.min(avgViralScore + Math.random() * 15, 100),
      bestPostTime: getPlatformOptimalTime(platform),
      demographicReach: getPlatformDemographics(platform),
      contentRecommendations: generateContentRecommendations(platform, tweets),
      riskFactors: generateRiskFactors(platform, tweets)
    };
  });

  return {
    predictions,
    overallViralScore: Math.floor(tweets.reduce((sum, t) => sum + (t.viralScore || 70), 0) / tweets.length),
    threadSynergy: threadConfiguration.isThread ? 85 : 70,
    crossPlatformSynergy: predictions.length > 1 ? 80 : 60,
    monetizationPotential: calculateMonetizationPotential(predictions),
    recommendedStrategy: generateRecommendedStrategy(predictions, threadConfiguration),
    successProbability: Math.floor(Math.random() * 25) + 75
  };
}

function generateContentRecommendations(platform: string, tweets: any[]) {
  const recommendations = {
    'twitter': [
      'Use Twitter polls for engagement',
      'Create thread summaries',
      'Engage with trending hashtags',
      'Use Twitter Spaces for discussions',
      'Pin important tweets'
    ],
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
    ]
  };

  return recommendations[platform] || recommendations['twitter'];
}

function generateRiskFactors(platform: string, tweets: any[]) {
  const risks = {
    'twitter': ['Algorithm changes', 'Tweet character limits', 'Potential for controversy'],
    'tiktok': ['Fast-moving trends', 'Algorithm volatility', 'Content lifespan'],
    'instagram': ['Declining organic reach', 'Algorithm changes', 'Story expiration'],
    'youtube': ['Competition for views', 'SEO requirements', 'Longer production time']
  };

  return risks[platform] || risks['twitter'];
}

function calculateMonetizationPotential(predictions: any[]) {
  const avgViews = predictions.reduce((sum, p) => sum + parseViews(p.expectedViews), 0) / predictions.length;
  const cpm = 1.5; // $1.50 CPM for Twitter

  return {
    adRevenue: `$${(avgViews * cpm / 1000).toFixed(2)}`,
    sponsorshipValue: `$${(avgViews * 3 / 1000).toFixed(2)}`,
    affiliateOpportunity: avgViews > 100000 ? 'High' : avgViews > 50000 ? 'Medium' : 'Low',
    influencerRate: `$${(avgViews / 1000 * 0.5).toFixed(2)} per 1K followers`
  };
}

function generateRecommendedStrategy(predictions: any[], threadConfiguration: any) {
  const strategy = [];

  if (threadConfiguration.isThread) {
    strategy.push('🧵 Post as a thread for maximum engagement');
    strategy.push('📌 Pin the first tweet for visibility');
  }

  strategy.push('⏰ Post during peak hours for your audience');
  strategy.push('💬 Engage with replies in the first hour');
  strategy.push('🔄 Retweet with additional context later');

  if (predictions.length > 1) {
    strategy.push('📱 Cross-post to other platforms with adaptations');
  }

  return strategy;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function parseViews(viewsStr: string): number {
  const multiplier = viewsStr.includes('M') ? 1000000 : viewsStr.includes('K') ? 1000 : 1;
  return parseFloat(viewsStr.replace(/[MK]/g, '')) * multiplier;
}

function getPlatformOptimalTime(platform: string): string {
  const times = {
    'twitter': '9-10 AM, 12-1 PM, 5-6 PM',
    'tiktok': '6-10 PM',
    'instagram': '6-9 PM',
    'youtube': '2-4 PM, 8-11 PM'
  };

  return times[platform] || times['twitter'];
}

function getPlatformDemographics(platform: string): string {
  const demographics = {
    'twitter': 'Adults (25-49)',
    'tiktok': 'Gen Z (16-24)',
    'instagram': 'Millennials (25-34)',
    'youtube': 'Mixed (18-54)'
  };

  return demographics[platform] || demographics['twitter'];
}
