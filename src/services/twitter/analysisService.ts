export function analyzeTweetSentiment(tweets: any[]) {
  const sentimentAnalysis = tweets.map(tweet => {
    const content = tweet.content.toLowerCase();

    // Simple sentiment analysis
    const positiveWords = ['amazing', 'great', 'love', 'awesome', 'fantastic', 'excellent', 'wonderful', 'perfect', 'brilliant', 'outstanding'];
    const negativeWords = ['terrible', 'awful', 'hate', 'horrible', 'worst', 'disgusting', 'pathetic', 'stupid', 'useless', 'garbage'];
    const neutralWords = ['okay', 'fine', 'average', 'normal', 'standard', 'typical', 'regular', 'common', 'usual', 'ordinary'];

    const positiveScore = positiveWords.reduce((score, word) => score + (content.includes(word) ? 1 : 0), 0);
    const negativeScore = negativeWords.reduce((score, word) => score + (content.includes(word) ? 1 : 0), 0);
    const neutralScore = neutralWords.reduce((score, word) => score + (content.includes(word) ? 1 : 0), 0);

    let sentiment = 'neutral';
    if (positiveScore > negativeScore && positiveScore > neutralScore) sentiment = 'positive';
    else if (negativeScore > positiveScore && negativeScore > neutralScore) sentiment = 'negative';

    // Engagement potential based on sentiment
    const engagementScore = {
      positive: 75,
      negative: 85, // Controversial content often gets more engagement
      neutral: 60
    }[sentiment];

    // Controversy score
    const controversyTriggers = ['unpopular', 'hot take', 'controversial', 'fight me', 'disagree', 'wrong', 'stupid'];
    const controversyScore = controversyTriggers.reduce((score, trigger) => score + (content.includes(trigger) ? 20 : 0), 0);

    // Humor score
    const humorTriggers = ['lol', 'lmao', 'funny', 'hilarious', 'joke', 'meme', 'pov:', 'me trying', 'when you'];
    const humorScore = humorTriggers.reduce((score, trigger) => score + (content.includes(trigger) ? 15 : 0), 0);

    return {
      tweetId: tweet.id,
      sentiment,
      scores: {
        positive: positiveScore,
        negative: negativeScore,
        neutral: neutralScore
      },
      metrics: {
        engagement: Math.min(engagementScore + Math.random() * 10, 100),
        controversy: Math.min(controversyScore, 100),
        humor: Math.min(humorScore, 100),
        relatability: Math.floor(Math.random() * 30) + 70
      }
    };
  });

  const overallSentiment = {
    positive: sentimentAnalysis.filter(s => s.sentiment === 'positive').length,
    negative: sentimentAnalysis.filter(s => s.sentiment === 'negative').length,
    neutral: sentimentAnalysis.filter(s => s.sentiment === 'neutral').length
  };

  const avgEngagement = sentimentAnalysis.reduce((sum, s) => sum + s.metrics.engagement, 0) / sentimentAnalysis.length;
  const avgControversy = sentimentAnalysis.reduce((sum, s) => sum + s.metrics.controversy, 0) / sentimentAnalysis.length;

  return {
    tweetAnalysis: sentimentAnalysis,
    overallSentiment,
    averageMetrics: {
      engagement: Math.floor(avgEngagement),
      controversy: Math.floor(avgControversy),
      humor: Math.floor(sentimentAnalysis.reduce((sum, s) => sum + s.metrics.humor, 0) / sentimentAnalysis.length),
      relatability: Math.floor(sentimentAnalysis.reduce((sum, s) => sum + s.metrics.relatability, 0) / sentimentAnalysis.length)
    },
    recommendations: generateSentimentRecommendations(overallSentiment, avgEngagement, avgControversy)
  };
}

export function analyzeTwitterCompetitors(topic: string, tweetStyle: string, targetAudience: string) {
  const competitors = [
    {
      name: 'TweetMaster',
      handle: '@tweetmaster',
      followers: '2.3M',
      avgEngagement: '45K',
      viralScore: 92,
      specialties: ['Viral content', 'Trending topics', 'Community engagement'],
      strengths: ['Consistent posting', 'High engagement', 'Trend awareness'],
      weaknesses: ['Limited originality', 'Repetitive format'],
      topTweets: [
        'This will change everything about how you think...',
        'Thread: The truth about {topic} that no one talks about',
        'Hot take: {topic} is completely overrated'
      ]
    },
    {
      name: 'ThreadKing',
      handle: '@threadking',
      followers: '1.8M',
      avgEngagement: '38K',
      viralScore: 88,
      specialties: ['Long-form threads', 'Educational content', 'Storytelling'],
      strengths: ['Detailed analysis', 'Educational value', 'Thread structure'],
      weaknesses: ['Lower viral potential', 'Niche audience'],
      topTweets: [
        'Thread: Everything you need to know about {topic} 🧵',
        'The complete guide to {topic} in 2024',
        'Why {topic} matters more than you think'
      ]
    },
    {
      name: 'ViralQueen',
      handle: '@viralqueen',
      followers: '3.1M',
      avgEngagement: '67K',
      viralScore: 95,
      specialties: ['Viral content', 'Controversy', 'Pop culture'],
      strengths: ['Viral mastery', 'Timing', 'Audience psychology'],
      weaknesses: ['Sustainability concerns', 'Brand risk'],
      topTweets: [
        'Unpopular opinion that will get me cancelled...',
        'The {topic} discourse is getting out of hand',
        'Nobody: Me: Here\'s why {topic} is problematic'
      ]
    }
  ];

  const marketAnalysis = {
    competitionLevel: 'high',
    marketGaps: [
      'Authentic educational content without clickbait',
      'Balanced controversial takes with constructive discussion',
      'Visual storytelling combined with text',
      'Interactive thread formats'
    ],
    opportunities: [
      'Underserved demographics in {targetAudience}',
      'Growing interest in {topic}',
      'Video-first content strategy',
      'Cross-platform thread distribution'
    ],
    threats: [
      'Algorithm changes affecting reach',
      'Increased competition from established accounts',
      'Platform policy changes',
      'Audience fatigue with {tweetStyle} content'
    ]
  };

  return {
    competitors,
    marketAnalysis,
    recommendations: [
      'Focus on unique angle: combine {tweetStyle} with visual elements',
      'Build consistent posting schedule during peak hours',
      'Engage with trending topics while maintaining brand voice',
      'Develop signature thread format to stand out',
      'Cross-promote on other platforms for audience growth'
    ],
    contentStrategy: {
      differentiation: 'Video-enhanced Twitter content with AI optimization',
      targetNiche: `${targetAudience} interested in ${topic}`,
      contentPillars: ['Educational', 'Entertaining', 'Engaging', 'Authentic'],
      postingStrategy: 'Mix of threads, single tweets, and video content'
    }
  };
}

function generateSentimentRecommendations(overallSentiment: any, avgEngagement: number, avgControversy: number) {
  const recommendations = [];

  if (overallSentiment.negative > overallSentiment.positive) {
    recommendations.push('Consider balancing negative content with positive perspectives');
  }

  if (avgEngagement < 70) {
    recommendations.push('Add more engaging elements like questions or calls-to-action');
  }

  if (avgControversy > 80) {
    recommendations.push('High controversy may increase engagement but consider brand safety');
  }

  if (overallSentiment.neutral > 0.7) {
    recommendations.push('Add more emotional language to increase engagement');
  }

  return recommendations;
}
