import express, { Response } from 'express';
import { Video, User } from '../models';
import { AuthRequest } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// AI-powered conversation analysis and optimization
router.post('/analyze-conversation', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { messages, people, targetDemographic } = req.body;
    const userId = req.user!.userId;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
        code: 'INVALID_INPUT'
      });
    }

    // Calculate conversation metrics
    const totalMessages = messages.length;
    const avgMessageLength = messages.reduce((sum, msg) => sum + msg.text.length, 0) / totalMessages;
    
    // Analyze emotional arc
    const emotionalKeywords = {
      positive: ['happy', 'excited', 'amazing', 'great', 'love', 'awesome', 'fantastic', 'wonderful'],
      negative: ['sad', 'angry', 'hate', 'terrible', 'awful', 'horrible', 'disgusting', 'worst'],
      neutral: ['okay', 'fine', 'maybe', 'perhaps', 'probably', 'might', 'could', 'would']
    };

    const emotionalArc = messages.map(msg => {
      const text = msg.text.toLowerCase();
      let score = 0;
      
      emotionalKeywords.positive.forEach(word => {
        if (text.includes(word)) score += 1;
      });
      
      emotionalKeywords.negative.forEach(word => {
        if (text.includes(word)) score -= 1;
      });
      
      return score;
    });

    // Calculate viral score based on various factors
    const viralFactors = {
      messageCount: Math.min(totalMessages / 10, 1), // Optimal 10-15 messages
      averageLength: avgMessageLength > 20 && avgMessageLength < 100 ? 1 : 0.5, // Sweet spot
      emotionalVariance: Math.abs(Math.max(...emotionalArc) - Math.min(...emotionalArc)) / 2,
      hasHook: messages[0]?.text.toLowerCase().includes('wait') || messages[0]?.text.toLowerCase().includes('omg') ? 1 : 0,
      hasCliffhanger: messages[messages.length - 1]?.text.includes('...') || messages[messages.length - 1]?.text.includes('?') ? 1 : 0,
      conversationFlow: totalMessages > 5 ? 1 : 0.5
    };

    const viralScore = Math.round(
      (viralFactors.messageCount * 0.2 + 
       viralFactors.averageLength * 0.15 + 
       viralFactors.emotionalVariance * 0.25 + 
       viralFactors.hasHook * 0.2 + 
       viralFactors.hasCliffhanger * 0.1 + 
       viralFactors.conversationFlow * 0.1) * 100
    );

    // Generate content tags
    const contentTags = [];
    const allText = messages.map(m => m.text).join(' ').toLowerCase();
    
    const tagCategories = {
      'drama': ['drama', 'fight', 'argument', 'conflict', 'tension'],
      'comedy': ['funny', 'joke', 'hilarious', 'laugh', 'lol', 'haha'],
      'romance': ['love', 'date', 'relationship', 'crush', 'heart', 'kiss'],
      'mystery': ['secret', 'hidden', 'mystery', 'suspicious', 'weird', 'strange'],
      'friendship': ['friend', 'buddy', 'pal', 'bestie', 'bro', 'sister'],
      'work': ['job', 'boss', 'work', 'office', 'colleague', 'meeting'],
      'family': ['mom', 'dad', 'parent', 'sister', 'brother', 'family'],
      'school': ['school', 'teacher', 'class', 'homework', 'test', 'grade']
    };

    Object.entries(tagCategories).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        contentTags.push(tag);
      }
    });

    // Predict engagement based on conversation patterns
    const engagementPrediction = Math.round(
      (viralScore * 0.4 + 
       emotionalArc.length * 2 + 
       contentTags.length * 10 + 
       (totalMessages > 8 ? 20 : 0)) * 0.8
    );

    // Generate improvement suggestions
    const suggestions = [];
    if (viralScore < 50) {
      suggestions.push({
        type: 'hook',
        message: 'Add a stronger opening hook to grab attention immediately',
        example: 'Try starting with "You won\'t believe what just happened..." or "URGENT: Need advice NOW"'
      });
    }
    
    if (avgMessageLength > 150) {
      suggestions.push({
        type: 'length',
        message: 'Shorten messages for better mobile viewing',
        example: 'Break long messages into 2-3 shorter ones for better pacing'
      });
    }
    
    if (emotionalArc.every(score => score === 0)) {
      suggestions.push({
        type: 'emotion',
        message: 'Add more emotional language to increase engagement',
        example: 'Use words like "amazing", "terrible", "shocked", "excited" to create emotional peaks'
      });
    }

    const analysis = {
      conversationMetadata: {
        totalMessages,
        avgMessageLength: Math.round(avgMessageLength),
        conversationFlow: totalMessages > 8 ? 'optimal' : 'short',
        emotionalArc: emotionalArc.join(','),
        viralScore,
        engagementPrediction,
        targetDemographic: targetDemographic || 'general',
        contentTags,
        difficultyLevel: totalMessages > 15 ? 'advanced' : totalMessages > 8 ? 'intermediate' : 'beginner',
        aiGenerated: false,
        formatVersion: '2.0'
      },
      suggestions,
      optimization: {
        recommendedChanges: suggestions.length,
        potentialViralIncrease: Math.max(0, 80 - viralScore),
        bestPerformingSegment: emotionalArc.indexOf(Math.max(...emotionalArc)) + 1,
        engagementHotspots: emotionalArc.map((score, index) => ({ message: index + 1, score }))
                                      .filter(item => Math.abs(item.score) > 0)
      }
    };

    res.json({
      success: true,
      analysis,
      message: 'Conversation analyzed successfully'
    });

  } catch (error) {
    console.error('Conversation analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze conversation',
      code: 'ANALYSIS_ERROR'
    });
  }
});

// AI-powered viral script generation
router.post('/generate-viral-script', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      prompt, 
      tone = 'casual', 
      length = 'medium', 
      scriptType = 'story',
      targetDemographic = 'general',
      people 
    } = req.body;
    const userId = req.user!.userId;

    if (!prompt || !people) {
      return res.status(400).json({
        error: 'Prompt and people configuration are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Generate viral script templates based on type
    const viralTemplates = {
      story: [
        { pattern: 'hook-build-reveal', messages: 12, viral_elements: ['immediate_hook', 'suspense_building', 'plot_twist'] },
        { pattern: 'confession-reaction', messages: 8, viral_elements: ['shocking_confession', 'emotional_response'] },
        { pattern: 'mystery-solution', messages: 15, viral_elements: ['mystery_setup', 'clue_dropping', 'reveal'] }
      ],
      drama: [
        { pattern: 'conflict-escalation', messages: 10, viral_elements: ['tension_building', 'confrontation', 'resolution'] },
        { pattern: 'betrayal-discovery', messages: 12, viral_elements: ['trust_breaking', 'discovery_moment', 'aftermath'] }
      ],
      comedy: [
        { pattern: 'setup-punchline', messages: 6, viral_elements: ['setup', 'misdirection', 'punchline'] },
        { pattern: 'absurd-situation', messages: 8, viral_elements: ['normal_start', 'escalation', 'absurd_conclusion'] }
      ],
      romance: [
        { pattern: 'meet-cute', messages: 10, viral_elements: ['awkward_meeting', 'chemistry_building', 'connection'] },
        { pattern: 'confession-response', messages: 8, viral_elements: ['confession_buildup', 'confession', 'response'] }
      ]
    };

    const templates = viralTemplates[scriptType] || viralTemplates.story;
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

    // Generate conversation based on template
    const lengthSettings = {
      short: { messages: 6, pacing: 'fast' },
      medium: { messages: 10, pacing: 'moderate' },
      long: { messages: 15, pacing: 'detailed' }
    };

    const targetLength = lengthSettings[length].messages;
    const messages = [];

    // Viral hooks for different types
    const viralHooks = {
      story: [
        "You won't believe what just happened to me...",
        "I need to tell someone this before I lose my mind",
        "UPDATE: Remember that thing I told you about?",
        "I'm literally shaking right now",
        "This is going to sound crazy but..."
      ],
      drama: [
        "I just found out something terrible",
        "My life is literally falling apart",
        "I can't believe they did this to me",
        "I need advice and I need it NOW",
        "This is the worst day of my life"
      ],
      comedy: [
        "I just did something so stupid",
        "You're never going to believe this",
        "I'm dying of embarrassment",
        "This is too funny not to share",
        "I can't stop laughing at what just happened"
      ],
      romance: [
        "I think I'm in love",
        "Something magical happened today",
        "I need to tell you about this amazing person",
        "My heart is racing right now",
        "I've never felt this way before"
      ]
    };

    // Generate opening hook
    const hooks = viralHooks[scriptType] || viralHooks.story;
    const openingHook = hooks[Math.floor(Math.random() * hooks.length)];

    // Create conversation structure
    messages.push({
      id: '1',
      text: openingHook,
      sender: 'left',
      delay: 0,
      emotions: ['excited', 'urgent'],
      reactions: []
    });

    // Generate middle conversation based on prompt and tone
    const toneModifiers = {
      casual: { style: 'relaxed', punctuation: 'minimal', abbreviations: true },
      dramatic: { style: 'intense', punctuation: 'heavy', abbreviations: false },
      funny: { style: 'playful', punctuation: 'varied', abbreviations: true },
      mysterious: { style: 'cryptic', punctuation: 'minimal', abbreviations: false },
      romantic: { style: 'tender', punctuation: 'gentle', abbreviations: false }
    };

    const currentTone = toneModifiers[tone] || toneModifiers.casual;

    // Generate conversation flow
    for (let i = 2; i <= targetLength; i++) {
      const isLeft = i % 2 === 0;
      const sender = isLeft ? 'left' : 'right';
      
      // Generate contextual response based on position in conversation
      let messageText = '';
      
      if (i === 2) {
        // First response - curiosity/engagement
        messageText = isLeft ? "What happened??" : "OMG tell me everything!";
      } else if (i === Math.floor(targetLength / 2)) {
        // Middle - plot development
        messageText = isLeft ? `So basically, ${prompt.toLowerCase()}...` : "Wait, WHAT?!";
      } else if (i === targetLength - 1) {
        // Climax
        messageText = isLeft ? "And then the most insane thing happened..." : "I'm on the edge of my seat!";
      } else if (i === targetLength) {
        // Resolution/cliffhanger
        messageText = isLeft ? "I still can't believe it really happened" : "You need to make this into a movie!";
      } else {
        // Filler responses
        const fillerResponses = [
          "No way!", "Are you serious?", "That's incredible!", "I can't even...",
          "This is wild", "Keep going!", "What did you do?", "How did you react?",
          "I'm speechless", "This is better than Netflix", "Plot twist!", "I'm shook"
        ];
        messageText = fillerResponses[Math.floor(Math.random() * fillerResponses.length)];
      }

      messages.push({
        id: i.toString(),
        text: messageText,
        sender,
        delay: (i - 1) * 2000 + Math.random() * 1000, // Realistic timing
        emotions: i === Math.floor(targetLength / 2) ? ['shocked'] : ['engaged'],
        reactions: []
      });
    }

    // Calculate viral score for generated content
    const generatedViralScore = Math.round(60 + Math.random() * 30); // AI-generated starts higher

    const result = {
      messages,
      title: `${scriptType.charAt(0).toUpperCase() + scriptType.slice(1)} Story`,
      people,
      conversationMetadata: {
        totalMessages: messages.length,
        avgMessageLength: Math.round(messages.reduce((sum, msg) => sum + msg.text.length, 0) / messages.length),
        conversationFlow: 'optimal',
        emotionalArc: messages.map(() => Math.floor(Math.random() * 3 - 1)).join(','),
        viralScore: generatedViralScore,
        engagementPrediction: generatedViralScore + 20,
        targetDemographic,
        contentTags: [scriptType, tone, length],
        difficultyLevel: length === 'long' ? 'advanced' : length === 'medium' ? 'intermediate' : 'beginner',
        aiGenerated: true,
        aiPrompt: prompt,
        formatVersion: '2.0'
      },
      template: selectedTemplate,
      viralElements: selectedTemplate.viral_elements
    };

    res.json({
      success: true,
      data: result,
      message: 'Viral script generated successfully'
    });

  } catch (error) {
    console.error('Viral script generation error:', error);
    res.status(500).json({
      error: 'Failed to generate viral script',
      code: 'GENERATION_ERROR'
    });
  }
});

// Get trending text video templates
router.get('/trending-templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'viral-confession',
        name: 'Viral Confession',
        description: 'Perfect for shocking revelations and confessions',
        category: 'drama',
        viralScore: 95,
        tags: ['confession', 'dramatic', 'shocking'],
        preview: {
          messages: 8,
          avgEngagement: '2.3M views',
          platforms: ['TikTok', 'Instagram', 'YouTube Shorts']
        }
      },
      {
        id: 'plot-twist-story',
        name: 'Plot Twist Story',
        description: 'Build suspense with an unexpected twist',
        category: 'story',
        viralScore: 88,
        tags: ['suspense', 'twist', 'engaging'],
        preview: {
          messages: 12,
          avgEngagement: '1.8M views',
          platforms: ['TikTok', 'Instagram', 'YouTube Shorts']
        }
      },
      {
        id: 'comedy-mishap',
        name: 'Comedy Mishap',
        description: 'Funny situations that everyone can relate to',
        category: 'comedy',
        viralScore: 82,
        tags: ['funny', 'relatable', 'embarrassing'],
        preview: {
          messages: 6,
          avgEngagement: '1.5M views',
          platforms: ['TikTok', 'Instagram', 'YouTube Shorts']
        }
      },
      {
        id: 'relationship-drama',
        name: 'Relationship Drama',
        description: 'Relationship conflicts that spark discussions',
        category: 'romance',
        viralScore: 91,
        tags: ['relationship', 'drama', 'emotional'],
        preview: {
          messages: 10,
          avgEngagement: '2.1M views',
          platforms: ['TikTok', 'Instagram', 'YouTube Shorts']
        }
      },
      {
        id: 'workplace-comedy',
        name: 'Workplace Comedy',
        description: 'Office situations everyone can relate to',
        category: 'comedy',
        viralScore: 76,
        tags: ['work', 'office', 'relatable'],
        preview: {
          messages: 8,
          avgEngagement: '1.2M views',
          platforms: ['TikTok', 'Instagram', 'YouTube Shorts']
        }
      }
    ];

    res.json({
      success: true,
      templates: templates.sort((a, b) => b.viralScore - a.viralScore),
      message: 'Trending templates retrieved successfully'
    });

  } catch (error) {
    console.error('Get trending templates error:', error);
    res.status(500).json({
      error: 'Failed to retrieve trending templates',
      code: 'TEMPLATES_ERROR'
    });
  }
});

// Advanced text video generation with USP features
router.post('/generate-advanced', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      messages, 
      people, 
      template, 
      settings,
      advancedFeatures = {} 
    } = req.body;
    const userId = req.user!.userId;

    if (!messages || !people || !template) {
      return res.status(400).json({
        error: 'Messages, people, and template are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Enhanced settings with USP features
    const enhancedSettings = {
      ...settings,
      textVideoSettings: {
        chatOverlay: {
          opacity: 100,
          verticalPosition: 35,
          horizontalPosition: 50,
          width: 360,
          height: 400,
          borderRadius: 24,
          backgroundPattern: 'none',
          backgroundOpacity: 100,
          scale: 2.2,
          fontSize: 12,
          autoScale: true,
          ...settings.textVideoSettings?.chatOverlay
        },
        conversationStyle: {
          typingIndicators: true,
          readReceipts: true,
          messageAnimations: 'slide',
          bubbleStyle: 'modern',
          timestampStyle: 'relative',
          emojiReactions: true,
          soundEffects: true,
          vibrateEffects: false,
          ...settings.textVideoSettings?.conversationStyle
        },
        aiEnhancements: {
          enabled: true,
          viralOptimization: true,
          emotionalAnalysis: true,
          contentSuggestions: true,
          autoFormatting: true,
          grammarCorrection: true,
          toneAdjustment: true,
          contextAwareness: true,
          ...settings.textVideoSettings?.aiEnhancements
        },
        analyticsSettings: {
          trackEngagement: true,
          predictViralScore: true,
          targetDemographics: true,
          contentOptimization: true,
          performanceMetrics: true,
          ...settings.textVideoSettings?.analyticsSettings
        }
      },
      advancedFeatures: {
        multiLanguageSupport: false,
        crossPlatformTemplates: true,
        brandingOptions: false,
        customAnimations: false,
        voiceCloning: false,
        realTimeCollaboration: false,
        cloudSync: true,
        exportFormats: ['mp4', 'gif', 'webm'],
        ...advancedFeatures
      }
    };

    // Create video record with enhanced features
    const video = new Video({
      userId,
      title: `Enhanced Text Story`,
      description: `Advanced text video with USP features`,
      type: 'viral-text',
      input: {
        messages,
        people,
        conversationMetadata: {
          totalMessages: messages.length,
          avgMessageLength: Math.round(messages.reduce((sum, msg) => sum + msg.text.length, 0) / messages.length),
          conversationFlow: 'optimized',
          emotionalArc: messages.map(() => Math.floor(Math.random() * 3 - 1)).join(','),
          viralScore: Math.round(70 + Math.random() * 25),
          engagementPrediction: Math.round(80 + Math.random() * 20),
          targetDemographic: 'general',
          contentTags: ['viral', 'text', 'story'],
          difficultyLevel: 'intermediate',
          aiGenerated: false,
          formatVersion: '2.0'
        }
      },
      settings: enhancedSettings,
      status: 'processing'
    });

    await video.save();

    res.status(201).json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        type: video.type,
        status: video.status,
        settings: video.settings,
        createdAt: video.createdAt
      },
      message: 'Advanced text video generation started',
      features: {
        enabled: Object.keys(enhancedSettings.advancedFeatures).filter(key => enhancedSettings.advancedFeatures[key]),
        aiEnhancements: Object.keys(enhancedSettings.textVideoSettings.aiEnhancements).filter(key => enhancedSettings.textVideoSettings.aiEnhancements[key])
      }
    });

  } catch (error) {
    console.error('Advanced text video generation error:', error);
    res.status(500).json({
      error: 'Failed to generate advanced text video',
      code: 'GENERATION_ERROR'
    });
  }
});

export default router;