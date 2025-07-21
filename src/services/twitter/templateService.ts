import { generateHashtags } from '../../utils';

export function generateAITweets(params: any) {
  const { topic, tweetStyle, tweetCount, targetAudience, viralFactor, includeThread } = params;

  const tweetTemplates = {
    informative: [
      "Did you know that {topic}? This fascinating insight will change how you think about {subject}.",
      "Breaking: New research on {topic} reveals surprising findings that could impact {industry}.",
      "Thread: Everything you need to know about {topic} in {year} 🧵",
      "Quick facts about {topic} that everyone should know:",
      "The science behind {topic} is more complex than you think."
    ],
    controversial: [
      "Unpopular opinion: {topic} is completely overrated. Here's why...",
      "Hot take: {topic} is actually harmful to {group}. Fight me.",
      "Nobody wants to hear this, but {topic} is the real problem.",
      "I'm going to say it: {topic} needs to be banned immediately.",
      "The uncomfortable truth about {topic} that nobody talks about."
    ],
    funny: [
      "Me trying to understand {topic}: *confused screaming*",
      "{topic} really said 'let me ruin everyone's day' and I respect that.",
      "POV: You're explaining {topic} to your parents",
      "Things that make no sense: {topic}, my life choices, pineapple on pizza",
      "Update: {topic} is still not working. This is fine. Everything is fine."
    ],
    inspirational: [
      "Remember: {topic} doesn't define you. Your response to it does.",
      "Today's reminder: {topic} is possible if you believe in yourself.",
      "Your journey with {topic} is valid, no matter how long it takes.",
      "Small steps towards {topic} are still progress. Keep going.",
      "The world needs your unique perspective on {topic}."
    ]
  };

  const templates = tweetTemplates[tweetStyle] || tweetTemplates.informative;
  const tweets = [];

  for (let i = 0; i < tweetCount; i++) {
    const template = templates[i % templates.length];
    const tweetText = template.replace(/\{topic\}/g, topic)
                              .replace(/\{subject\}/g, getRandomSubject())
                              .replace(/\{industry\}/g, getRandomIndustry())
                              .replace(/\{year\}/g, '2024')
                              .replace(/\{group\}/g, getRandomGroup());

    tweets.push({
      id: `ai_tweet_${i + 1}`,
      content: enhanceTweetForViral(tweetText, viralFactor),
      order: i + 1,
      profile: generateRandomProfile(),
      engagement: generateRandomEngagement(viralFactor),
      metadata: {
        timestamp: new Date(Date.now() - Math.random() * 86400000),
        hashtags: generateHashtags(topic, tweetStyle, 'twitter'),
        mentions: [],
        language: 'en'
      },
      viralScore: Math.floor(Math.random() * 20) + 80,
      engagementPrediction: Math.floor(Math.random() * 25) + 75
    });
  }

  return {
    tweets,
    threadConfiguration: {
      isThread: includeThread,
      threadTitle: includeThread ? `Thread: ${topic}` : '',
      displayMode: includeThread ? 'sequential' : 'compilation'
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      aiModel: 'GPT-4-Turbo',
      confidence: 0.93,
      viralPotential: Math.floor(Math.random() * 20) + 80
    }
  };
}

export function getViralTwitterTemplates(category: string, sortBy: string) {
  const templates = [
    {
      id: 'viral_thread',
      name: 'Viral Thread Starter',
      category: 'threads',
      viralScore: 94,
      description: 'Perfect template for creating viral Twitter threads',
      preview: '🧵',
      template: 'Thread: {topic} - everything you need to know 🧵\n\n1/{count}',
      features: ['Thread numbering', 'Hook optimization', 'Engagement boosters'],
      avgEngagement: '45K interactions',
      platforms: ['Twitter', 'LinkedIn'],
      difficulty: 'intermediate'
    },
    {
      id: 'controversial_take',
      name: 'Hot Take Generator',
      category: 'controversial',
      viralScore: 96,
      description: 'Controversial takes that spark debate and engagement',
      preview: '🔥',
      template: 'Unpopular opinion: {opinion}\n\nHere\'s why I think this... 🧵',
      features: ['Controversy hooks', 'Debate starters', 'Engagement magnets'],
      avgEngagement: '67K interactions',
      platforms: ['Twitter', 'TikTok'],
      difficulty: 'advanced'
    },
    {
      id: 'breaking_news',
      name: 'Breaking News Format',
      category: 'news',
      viralScore: 92,
      description: 'Professional breaking news and update format',
      preview: '📰',
      template: 'BREAKING: {news}\n\nWhat this means: 🧵\n\n1/{count}',
      features: ['News formatting', 'Credibility signals', 'Update threads'],
      avgEngagement: '38K interactions',
      platforms: ['Twitter', 'LinkedIn'],
      difficulty: 'beginner'
    },
    {
      id: 'story_time',
      name: 'Story Time Thread',
      category: 'storytelling',
      viralScore: 89,
      description: 'Engaging storytelling format for personal experiences',
      preview: '📚',
      template: 'Story time: {story_hook}\n\nThis happened to me last week... 🧵',
      features: ['Narrative structure', 'Personal connection', 'Cliffhangers'],
      avgEngagement: '42K interactions',
      platforms: ['Twitter', 'Instagram'],
      difficulty: 'intermediate'
    },
    {
      id: 'educational_series',
      name: 'Educational Series',
      category: 'educational',
      viralScore: 85,
      description: 'Educational content that teaches while entertaining',
      preview: '🎓',
      template: 'Today I learned: {fact}\n\nHere\'s why this matters 🧵\n\n1/{count}',
      features: ['Learning hooks', 'Fact presentation', 'Practical applications'],
      avgEngagement: '31K interactions',
      platforms: ['Twitter', 'LinkedIn', 'YouTube'],
      difficulty: 'beginner'
    }
  ];

  let filteredTemplates = templates;

  if (category !== 'all') {
    filteredTemplates = templates.filter(t => t.category === category);
  }

  // Sort templates
  filteredTemplates.sort((a, b) => {
    switch (sortBy) {
      case 'viral':
        return b.viralScore - a.viralScore;
      case 'engagement':
        return parseFloat(b.avgEngagement) - parseFloat(a.avgEngagement);
      case 'recent':
        return 0; // Would sort by creation date
      default:
        return 0;
    }
  });

  return filteredTemplates;
}

// Helper functions
function getRandomSubject() {
  const subjects = ['technology', 'society', 'business', 'life', 'relationships', 'career', 'health', 'creativity'];
  return subjects[Math.floor(Math.random() * subjects.length)];
}

function getRandomIndustry() {
  const industries = ['tech', 'healthcare', 'finance', 'education', 'entertainment', 'retail', 'manufacturing'];
  return industries[Math.floor(Math.random() * industries.length)];
}

function getRandomGroup() {
  const groups = ['millennials', 'gen z', 'entrepreneurs', 'students', 'professionals', 'creators', 'investors'];
  return groups[Math.floor(Math.random() * groups.length)];
}

function generateRandomProfile() {
  const names = ['Alex Johnson', 'Sarah Chen', 'Mike Rodriguez', 'Emma Davis', 'David Kim', 'Lisa Wang'];
  const usernames = ['alexj', 'sarahc', 'mikemr', 'emmad', 'davidk', 'lisaw'];

  const randomIndex = Math.floor(Math.random() * names.length);

  return {
    displayName: names[randomIndex],
    username: usernames[randomIndex],
    avatarUrl: `https://ui-avatars.com/api/?name=${names[randomIndex]}&background=random`,
    isVerified: Math.random() > 0.7,
    isBlueVerified: Math.random() > 0.8,
    followerCount: Math.floor(Math.random() * 50000) + 1000,
    followingCount: Math.floor(Math.random() * 2000) + 100
  };
}

function generateRandomEngagement(viralFactor: string) {
  const multiplier = {
    'subtle': 1,
    'moderate': 2,
    'high': 4,
    'extreme': 8
  }[viralFactor] || 1;

  return {
    likes: Math.floor(Math.random() * 1000 * multiplier) + 50,
    retweets: Math.floor(Math.random() * 200 * multiplier) + 10,
    quotes: Math.floor(Math.random() * 50 * multiplier) + 5,
    replies: Math.floor(Math.random() * 100 * multiplier) + 8,
    views: Math.floor(Math.random() * 10000 * multiplier) + 500,
    bookmarks: Math.floor(Math.random() * 150 * multiplier) + 15
  };
}

// generateHashtags function moved to ../../utils/content.ts

function enhanceTweetForViral(text: string, viralFactor: string) {
  const enhancements = {
    'subtle': text,
    'moderate': text + ' 🧵',
    'high': text + ' 🧵\n\nWhat do you think?',
    'extreme': '🚨 ' + text + ' 🧵\n\nThis is HUGE. RT if you agree!'
  };

  return enhancements[viralFactor] || text;
}
