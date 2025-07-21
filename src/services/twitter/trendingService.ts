export function generateTrendingTwitterTopics(category: string, platform: string) {
  const topics = {
    general: [
      { topic: 'AI Revolution', hashtags: ['#AI', '#Innovation', '#Future'], viralScore: 94, engagement: '4.2M' },
      { topic: 'Climate Crisis', hashtags: ['#ClimateChange', '#Sustainability', '#Environment'], viralScore: 88, engagement: '3.1M' },
      { topic: 'Space Exploration', hashtags: ['#SpaceX', '#NASA', '#Space'], viralScore: 91, engagement: '3.8M' },
      { topic: 'Cryptocurrency', hashtags: ['#Bitcoin', '#Crypto', '#Blockchain'], viralScore: 85, engagement: '2.9M' },
      { topic: 'Mental Health', hashtags: ['#MentalHealth', '#SelfCare', '#Awareness'], viralScore: 89, engagement: '3.5M' },
      { topic: 'Remote Work', hashtags: ['#RemoteWork', '#WorkFromHome', '#DigitalNomad'], viralScore: 82, engagement: '2.4M' },
      { topic: 'Social Justice', hashtags: ['#Justice', '#Equality', '#Change'], viralScore: 87, engagement: '3.2M' },
      { topic: 'Tech Innovations', hashtags: ['#Technology', '#Innovation', '#Startup'], viralScore: 90, engagement: '3.6M' },
      { topic: 'Education Reform', hashtags: ['#Education', '#Learning', '#Students'], viralScore: 83, engagement: '2.7M' },
      { topic: 'Healthcare', hashtags: ['#Healthcare', '#Medicine', '#Wellness'], viralScore: 86, engagement: '3.0M' }
    ],
    viral: [
      { topic: 'Controversial Takes', hashtags: ['#UnpopularOpinion', '#HotTake', '#Debate'], viralScore: 96, engagement: '5.1M' },
      { topic: 'Breaking News', hashtags: ['#Breaking', '#News', '#Update'], viralScore: 95, engagement: '4.8M' },
      { topic: 'Celebrity Drama', hashtags: ['#CelebNews', '#Entertainment', '#Drama'], viralScore: 93, engagement: '4.5M' },
      { topic: 'Viral Challenges', hashtags: ['#Challenge', '#Trend', '#Viral'], viralScore: 92, engagement: '4.2M' },
      { topic: 'Meme Culture', hashtags: ['#Memes', '#Funny', '#Internet'], viralScore: 90, engagement: '3.9M' }
    ],
    comedy: [
      { topic: 'Relatable Humor', hashtags: ['#Relatable', '#Funny', '#Life'], viralScore: 88, engagement: '3.4M' },
      { topic: 'Observational Comedy', hashtags: ['#Comedy', '#Humor', '#Jokes'], viralScore: 85, engagement: '2.8M' },
      { topic: 'Parody Content', hashtags: ['#Parody', '#Satire', '#Funny'], viralScore: 87, engagement: '3.1M' },
      { topic: 'Wholesome Memes', hashtags: ['#Wholesome', '#Positive', '#Memes'], viralScore: 84, engagement: '2.6M' },
      { topic: 'Internet Culture', hashtags: ['#InternetCulture', '#Online', '#Digital'], viralScore: 86, engagement: '2.9M' }
    ]
  };

  return topics[category] || topics.general;
}
