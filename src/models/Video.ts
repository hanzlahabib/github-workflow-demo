import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'text-story' | 'reddit' | 'fake-text' | 'split' | 'ai-story' | 'would-you-rather' | 'voiceover' | 'quiz' | 'auto-captions' | 'viral-text' | 'ai-text-story' | 'conversation-story' | 'top-5-videos' | 'viral-top-5' | 'ai-top-5' | 'twitter-video' | 'viral-twitter' | 'ai-twitter';
  status: 'processing' | 'completed' | 'failed';
  input: {
    text?: string;
    script?: string;
    redditUrl?: string;
    audioFile?: string;
    images?: string[];
    messages?: {
      id: string;
      text: string;
      sender: 'left' | 'right';
      delay: number;
      avatar?: string;
      timestamp?: Date;
      readStatus?: 'sent' | 'delivered' | 'read';
      emotions?: string[];
      reactions?: string[];
    }[];
    people?: {
      left: {
        name: string;
        avatar: {
          id: string;
          url: string;
          type: 'default' | 'custom' | 'ai-generated';
        };
        voiceId?: string;
        voiceName?: string;
        isVerified?: boolean;
        isOnline?: boolean;
        username?: string;
        lastSeen?: string;
        businessType?: string;
        personality?: string;
        tone?: string;
      };
      right: {
        name: string;
        avatar: {
          id: string;
          url: string;
          type: 'default' | 'custom' | 'ai-generated';
        };
        voiceId?: string;
        voiceName?: string;
        isVerified?: boolean;
        isOnline?: boolean;
        username?: string;
        lastSeen?: string;
        businessType?: string;
        personality?: string;
        tone?: string;
      };
    };
    conversationMetadata?: {
      totalMessages: number;
      avgMessageLength: number;
      conversationFlow: string;
      emotionalArc: string;
      viralScore: number;
      engagementPrediction: number;
      targetDemographic: string;
      contentTags: string[];
      difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
      aiGenerated: boolean;
      aiPrompt?: string;
      formatVersion: string;
    };
    // Top 5 Videos specific fields
    top5VideosData?: {
      items: {
        id: string;
        title: string;
        description?: string;
        rank: number;
        videoFile: string;
        thumbnailUrl?: string;
        duration: number;
        isMuted: boolean;
        transitions: {
          enterAnimation: string;
          exitAnimation: string;
          duration: number;
        };
        metadata: {
          originalFileName: string;
          uploadedAt: Date;
          fileSize: number;
          format: string;
          resolution: string;
        };
      }[];
      configuration: {
        mainTitle: string;
        itemCount: 2 | 3 | 4 | 5;
        countdownDirection: 'ascending' | 'descending';
        displayDuration: number;
        transitionStyle: 'fade' | 'slide' | 'zoom' | 'bounce';
        backgroundMusic?: string;
        musicVolume: number;
        voiceoverEnabled: boolean;
        voiceoverScript?: string;
        voiceId?: string;
      };
      styling: {
        titleFont: {
          family: string;
          size: number;
          color: string;
          weight: 'normal' | 'bold' | 'bolder';
          shadow: boolean;
          outline: boolean;
        };
        rankFont: {
          family: string;
          size: number;
          color: string;
          weight: 'normal' | 'bold' | 'bolder';
          shadow: boolean;
          outline: boolean;
        };
        descriptionFont: {
          family: string;
          size: number;
          color: string;
          weight: 'normal' | 'bold' | 'bolder';
          shadow: boolean;
          outline: boolean;
        };
        layout: {
          verticalPosition: number;
          horizontalPosition: number;
          backgroundBlur: boolean;
          backgroundOpacity: number;
          bassBoostTransition: boolean;
          customTemplate?: string;
        };
        animations: {
          textEntryAnimation: string;
          videoRevealAnimation: string;
          rankingAnimation: string;
          customAnimations: boolean;
        };
      };
      viralOptimization?: {
        enabled: boolean;
        trendingTopics: string[];
        viralScore: number;
        engagementPrediction: number;
        targetDemographics: string[];
        contentTags: string[];
        optimalTiming: string;
        platformOptimization: {
          tiktok: boolean;
          instagram: boolean;
          youtube: boolean;
          twitter: boolean;
        };
        aiGeneratedContent: boolean;
        competitorAnalysis?: {
          similarContent: string[];
          performanceMetrics: any;
          improvementSuggestions: string[];
        };
      };
      analytics?: {
        expectedViews: number;
        expectedEngagement: number;
        viralPotential: number;
        demographicTargeting: string[];
        contentOptimization: string[];
        performancePredictions: any;
      };
    };
    // Twitter Videos specific fields
    twitterData?: {
      tweets: {
        id: string;
        content: string;
        order: number;
        profile: {
          displayName: string;
          username: string;
          avatarUrl: string;
          isVerified: boolean;
          isBlueVerified: boolean;
          followerCount: number;
          followingCount: number;
        };
        engagement: {
          likes: number;
          retweets: number;
          quotes: number;
          replies: number;
          views: number;
          bookmarks: number;
        };
        metadata: {
          timestamp: Date;
          isReplyTo?: string;
          isQuoteTweet?: boolean;
          originalTweetId?: string;
          mediaAttachments?: {
            type: 'image' | 'video' | 'gif';
            url: string;
            altText?: string;
          }[];
          hashtags: string[];
          mentions: string[];
          location?: string;
          language: string;
        };
        voiceSettings: {
          voiceId: string;
          voiceName: string;
          speed: number;
          pitch: number;
          volume: number;
        };
        styling: {
          theme: 'light' | 'dark' | 'custom';
          backgroundColor?: string;
          textColor?: string;
          accentColor?: string;
          fontFamily?: string;
          fontSize?: number;
          borderRadius?: number;
          shadow?: boolean;
        };
      }[];
      threadConfiguration: {
        isThread: boolean;
        threadTitle?: string;
        threadDescription?: string;
        displayMode: 'sequential' | 'compilation' | 'story';
        transitionStyle: 'fade' | 'slide' | 'zoom' | 'twitter-native';
        showEngagement: boolean;
        showTimestamps: boolean;
        showVerification: boolean;
        compactMode: boolean;
        autoPlay: boolean;
        loopVideo: boolean;
      };
      backgroundSettings: {
        videoBackground: string;
        backgroundOpacity: number;
        backgroundBlur: boolean;
        customVideoUrl?: string;
        musicTrack?: string;
        musicVolume: number;
        ambientSounds?: boolean;
        visualEffects?: {
          enabled: boolean;
          type: 'particle' | 'gradient' | 'pulse' | 'wave';
          intensity: number;
          color: string;
        };
      };
      viralOptimization?: {
        enabled: boolean;
        trendingHashtags: string[];
        viralScore: number;
        engagementPrediction: number;
        targetDemographics: string[];
        contentTags: string[];
        optimalTiming: string;
        platformOptimization: {
          twitter: boolean;
          tiktok: boolean;
          instagram: boolean;
          youtube: boolean;
        };
        aiEnhanced: boolean;
        sentimentAnalysis: {
          overall: 'positive' | 'negative' | 'neutral';
          engagement: number;
          controversy: number;
          humor: number;
          relatability: number;
        };
        competitorAnalysis?: {
          similarTweets: string[];
          performanceMetrics: any;
          improvementSuggestions: string[];
          trendingTopics: string[];
        };
      };
      analytics?: {
        expectedViews: number;
        expectedEngagement: number;
        viralPotential: number;
        demographicTargeting: string[];
        contentOptimization: string[];
        performancePredictions: any;
        riskFactors: string[];
        monetizationPotential: {
          adRevenue: number;
          sponsorshipValue: number;
          affiliateOpportunity: number;
          influencerRate: number;
        };
      };
    };
    options?: any;
  };
  output: {
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    captions?: string;
  };
  settings: {
    voice: string;
    language: string;
    background: string;
    music?: string;
    template: string;
    hasWatermark: boolean;
    textVideoSettings?: {
      chatOverlay?: {
        opacity?: number;
        verticalPosition?: number;
        horizontalPosition?: number;
        width?: number;
        height?: number;
        borderRadius?: number;
        backgroundPattern?: string;
        backgroundOpacity?: number;
        scale?: number;
        fontSize?: number;
        autoScale?: boolean;
      };
      conversationStyle?: {
        typingIndicators?: boolean;
        readReceipts?: boolean;
        messageAnimations?: string;
        bubbleStyle?: string;
        timestampStyle?: string;
        emojiReactions?: boolean;
        soundEffects?: boolean;
        vibrateEffects?: boolean;
      };
      aiEnhancements?: {
        enabled?: boolean;
        viralOptimization?: boolean;
        emotionalAnalysis?: boolean;
        contentSuggestions?: boolean;
        autoFormatting?: boolean;
        grammarCorrection?: boolean;
        toneAdjustment?: boolean;
        contextAwareness?: boolean;
      };
      analyticsSettings?: {
        trackEngagement?: boolean;
        predictViralScore?: boolean;
        targetDemographics?: boolean;
        contentOptimization?: boolean;
        performanceMetrics?: boolean;
      };
    };
    advancedFeatures?: {
      multiLanguageSupport?: boolean;
      crossPlatformTemplates?: boolean;
      brandingOptions?: boolean;
      customAnimations?: boolean;
      voiceCloning?: boolean;
      realTimeCollaboration?: boolean;
      cloudSync?: boolean;
      exportFormats?: string[];
    };
  };
  metadata: {
    size: number;
    format: string;
    resolution: string;
    fps: number;
  };
  jobId?: string;
  processingTime?: number;
  isPublic: boolean;
  views: number;
  likes: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: ['text-story', 'reddit', 'fake-text', 'split', 'ai-story', 'would-you-rather', 'voiceover', 'quiz', 'auto-captions', 'viral-text', 'ai-text-story', 'conversation-story']
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  input: {
    text: String,
    script: String,
    redditUrl: String,
    audioFile: String,
    images: [String],
    messages: [{
      id: String,
      text: String,
      sender: { type: String, enum: ['left', 'right'] },
      delay: Number,
      avatar: String,
      timestamp: Date,
      readStatus: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
      emotions: [String],
      reactions: [String]
    }],
    people: {
      left: {
        name: String,
        avatar: {
          id: String,
          url: String,
          type: { type: String, enum: ['default', 'custom', 'ai-generated'] }
        },
        voiceId: String,
        voiceName: String,
        isVerified: Boolean,
        isOnline: Boolean,
        username: String,
        lastSeen: String,
        businessType: String,
        personality: String,
        tone: String
      },
      right: {
        name: String,
        avatar: {
          id: String,
          url: String,
          type: { type: String, enum: ['default', 'custom', 'ai-generated'] }
        },
        voiceId: String,
        voiceName: String,
        isVerified: Boolean,
        isOnline: Boolean,
        username: String,
        lastSeen: String,
        businessType: String,
        personality: String,
        tone: String
      }
    },
    conversationMetadata: {
      totalMessages: Number,
      avgMessageLength: Number,
      conversationFlow: String,
      emotionalArc: String,
      viralScore: Number,
      engagementPrediction: Number,
      targetDemographic: String,
      contentTags: [String],
      difficultyLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
      aiGenerated: Boolean,
      aiPrompt: String,
      formatVersion: String
    },
    options: Schema.Types.Mixed
  },
  output: {
    videoUrl: String,
    thumbnailUrl: String,
    duration: Number,
    captions: String
  },
  settings: {
    voice: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: 'en'
    },
    background: {
      type: String,
      required: true
    },
    music: String,
    template: {
      type: String,
      required: true
    },
    hasWatermark: {
      type: Boolean,
      default: true
    },
    textVideoSettings: {
      chatOverlay: {
        opacity: { type: Number, default: 100 },
        verticalPosition: { type: Number, default: 35 },
        horizontalPosition: { type: Number, default: 50 },
        width: { type: Number, default: 360 },
        height: { type: Number, default: 400 },
        borderRadius: { type: Number, default: 24 },
        backgroundPattern: { type: String, default: 'none' },
        backgroundOpacity: { type: Number, default: 100 },
        scale: { type: Number, default: 2.2 },
        fontSize: { type: Number, default: 12 },
        autoScale: { type: Boolean, default: true }
      },
      conversationStyle: {
        typingIndicators: { type: Boolean, default: true },
        readReceipts: { type: Boolean, default: true },
        messageAnimations: { type: String, default: 'slide' },
        bubbleStyle: { type: String, default: 'modern' },
        timestampStyle: { type: String, default: 'relative' },
        emojiReactions: { type: Boolean, default: true },
        soundEffects: { type: Boolean, default: true },
        vibrateEffects: { type: Boolean, default: false }
      },
      aiEnhancements: {
        enabled: { type: Boolean, default: true },
        viralOptimization: { type: Boolean, default: true },
        emotionalAnalysis: { type: Boolean, default: true },
        contentSuggestions: { type: Boolean, default: true },
        autoFormatting: { type: Boolean, default: true },
        grammarCorrection: { type: Boolean, default: true },
        toneAdjustment: { type: Boolean, default: true },
        contextAwareness: { type: Boolean, default: true }
      },
      analyticsSettings: {
        trackEngagement: { type: Boolean, default: true },
        predictViralScore: { type: Boolean, default: true },
        targetDemographics: { type: Boolean, default: true },
        contentOptimization: { type: Boolean, default: true },
        performanceMetrics: { type: Boolean, default: true }
      }
    },
    advancedFeatures: {
      multiLanguageSupport: { type: Boolean, default: false },
      crossPlatformTemplates: { type: Boolean, default: true },
      brandingOptions: { type: Boolean, default: false },
      customAnimations: { type: Boolean, default: false },
      voiceCloning: { type: Boolean, default: false },
      realTimeCollaboration: { type: Boolean, default: false },
      cloudSync: { type: Boolean, default: true },
      exportFormats: [{ type: String, default: ['mp4', 'gif', 'webm'] }]
    }
  },
  metadata: {
    size: Number,
    format: String,
    resolution: String,
    fps: Number
  },
  jobId: String,
  processingTime: Number,
  isPublic: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ type: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ isPublic: 1, likes: -1 });

export const Video = mongoose.model<IVideo>('Video', videoSchema);