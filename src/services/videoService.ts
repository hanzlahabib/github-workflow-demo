// Native Video Service - No shell commands, 100% Node.js
// Uses Remotion programmatic API for video generation
// Ready for Lambda integration

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { RenderInternals } from '@remotion/renderer';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { cacheManager } from './cacheManager';
import type { R2UrlDetectionResult } from '../types/videoCache';

export interface VideoGenerationRequest {
  type: 'story' | 'reddit' | 'quiz' | 'educational' | 'text-story';
  input: {
    text?: string;
    script?: string;
    title?: string;
    config?: any; // Enhanced frontend config object with all new settings
  };
  settings: {
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    voice?: string;
    background?: string;
    language?: string;
  };
  userId: string;
}

export interface VideoGenerationResult {
  success: boolean;
  outputPath?: string;
  videoUrl?: string; // Added for real-time WebSocket integration
  sizeInBytes?: number;
  durationInSeconds?: number;
  width?: number;
  height?: number;
  renderTimeMs?: number;
  error?: string;
  cacheInfo?: {
    hadR2Videos: boolean;
    cachedUrls: number;
    cacheProcessingTimeMs: number;
    urlMappings: Record<string, string>;
  };
}

export interface ProgressCallback {
  (progress: {
    phase: 'caching' | 'bundling' | 'rendering' | 'encoding' | 'completed';
    progress: number; // 0-100
    message: string;
    renderedFrames?: number;
    totalFrames?: number;
  }): void;
}

export class VideoService {
  private videoServicePath: string;
  private rendersDir: string;
  private bundlePath?: string;
  private cacheInitialized = false;

  constructor() {
    // 🚀 SUBDOMAIN SUPPORT: Use environment variable for video service path
    const videoServiceUrl = process.env.VIDEO_SERVICE_PATH || process.env.VIDEO_SERVICE_URL;
    
    if (videoServiceUrl && (videoServiceUrl.startsWith('http://') || videoServiceUrl.startsWith('https://'))) {
      // For subdomain deployment - use HTTP video service
      console.log(`[VideoService] 🌐 Using remote video service: ${videoServiceUrl}`);
      this.videoServicePath = videoServiceUrl;
      this.rendersDir = '/tmp/video-renders'; // Use temp directory for remote mode
    } else {
      // For local development - use file system path
      this.videoServicePath = videoServiceUrl || path.resolve(__dirname, '../../../reelspeed-video-service');
      this.rendersDir = path.join(this.videoServicePath, 'renders');
      console.log(`[VideoService] 📁 Using local video service: ${this.videoServicePath}`);
    }
    
    this.ensureRendersDirectory();
  }

  /**
   * Initialize the video cache system
   */
  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) {
      return;
    }

    try {
      console.log('[VideoService] Initializing R2 video cache system...');
      await cacheManager.initialize();
      this.cacheInitialized = true;
      console.log('[VideoService] R2 video cache system initialized successfully');
    } catch (error) {
      console.error('[VideoService] Failed to initialize cache system:', error);
      // Don't throw - video service should work without cache
      console.warn('[VideoService] Continuing without cache system - R2 videos may cause timeouts');
    }
  }

  private async ensureRendersDirectory() {
    try {
      await fs.access(this.rendersDir);
    } catch {
      await fs.mkdir(this.rendersDir, { recursive: true });
      console.log('[VideoService] Created renders directory');
    }
  }

  private async getBundle(): Promise<string> {
    // 🚀 SUBDOMAIN SUPPORT: Check if using remote video service
    if (this.videoServicePath.startsWith('http://') || this.videoServicePath.startsWith('https://')) {
      console.log('[VideoService] 🌐 Remote video service detected - skipping local bundling');
      return this.videoServicePath; // Return URL instead of bundle path
    }

    // ✅ FORCE FRESH BUNDLE: Always create new bundle to pick up code changes
    // TODO: Re-enable caching for production by checking NODE_ENV
    // if (this.bundlePath) {
    //   return this.bundlePath;
    // }

    console.log('[VideoService] Bundling Remotion project...');

    const entryPoint = path.join(this.videoServicePath, 'src/index.ts');

    // Check if entry point exists
    try {
      await fs.access(entryPoint);
    } catch {
      throw new Error(`Remotion entry point not found: ${entryPoint}`);
    }

    // Bundle the Remotion project
    this.bundlePath = await bundle({
      entryPoint,
      onProgress: (progress) => {
        console.log(`[VideoService] Bundle progress: ${Math.round(progress * 100)}%`);
      },
    });

    console.log('[VideoService] Bundle created:', this.bundlePath);
    return this.bundlePath;
  }

  private getCompositionId(type: string): string {
    const compositionMap: { [key: string]: string } = {
      story: 'text-story', // ✅ FIXED: Use text-story composition from video service
      'text-story': 'text-story', // Support direct text-story type
      reddit: 'RedditVideo',
      quiz: 'QuizVideo',
      educational: 'EducationalVideo'
    };

    const selectedComposition = compositionMap[type] || 'text-story';

    console.log(`[VideoService] 🎬 COMPOSITION MAPPING DEBUG:`);
    console.log(`[VideoService] Input type: "${type}"`);
    console.log(`[VideoService] Available mappings:`, compositionMap);
    console.log(`[VideoService] Selected composition: "${selectedComposition}"`);
    console.log(`[VideoService] ✅ Now using "text-story" composition with direct config passthrough`);

    return selectedComposition;
  }

  /**
   * Process video config to cache and optimize R2 videos before rendering
   */
  async processConfigForCaching(request: VideoGenerationRequest, onProgress?: ProgressCallback): Promise<{
    processedConfig: any;
    cacheResult: R2UrlDetectionResult;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    
    // Initialize cache if not already done
    if (!this.cacheInitialized) {
      onProgress?.({
        phase: 'caching',
        progress: 2,
        message: 'Initializing enhanced video cache and optimization system...'
      });
      await this.initializeCache();
    }

    if (!this.cacheInitialized) {
      console.warn('[VideoService] Cache system not available, using original config');
      return {
        processedConfig: request.input.config,
        cacheResult: {
          hasR2Urls: false,
          r2Urls: [],
          updatedConfig: request.input.config,
          urlMappings: {}
        },
        processingTimeMs: Date.now() - startTime
      };
    }

    onProgress?.({
      phase: 'caching',
      progress: 5,
      message: 'Scanning config for R2 videos and optimizing...'
    });

    try {
      // Process the config to cache and optimize R2 videos
      const cacheResult = await cacheManager.processVideoConfig(request.input.config);
      
      if (cacheResult.hasR2Urls) {
        console.log(`[VideoService] ✅ Cached and optimized ${cacheResult.r2Urls.length} R2 videos for timeout-free rendering`);
        onProgress?.({
          phase: 'caching',
          progress: 15,
          message: `Cached and optimized ${cacheResult.r2Urls.length} R2 videos successfully`
        });
      } else {
        console.log('[VideoService] No R2 videos found in config');
        onProgress?.({
          phase: 'caching',
          progress: 15,
          message: 'No R2 videos to optimize'
        });
      }

      return {
        processedConfig: cacheResult.updatedConfig,
        cacheResult,
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('[VideoService] Failed to process config for caching and optimization:', error);
      // Fall back to original config
      return {
        processedConfig: request.input.config,
        cacheResult: {
          hasR2Urls: false,
          r2Urls: [],
          updatedConfig: request.input.config,
          urlMappings: {}
        },
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  public prepareInputProps(request: VideoGenerationRequest, processedConfig?: any): any {
    const { input, settings, type } = request;
    const configToUse = processedConfig || input.config;

    console.log('[VideoService] 🔍 prepareInputProps called with FULL request:', {
      type,
      requestKeys: Object.keys(request),
      input: input,
      inputKeys: Object.keys(input),
      hasInputConfig: !!input.config,
      hasProcessedConfig: !!processedConfig,
      configKeys: configToUse ? Object.keys(configToUse) : 'no config',
      settingsKeys: Object.keys(settings)
    });

    // PRIORITY: Check if we have enhanced config from frontend
    if (configToUse) {
      console.log('[VideoService] ✅ Enhanced config detected! Details:', {
        title: configToUse.title,
        messagesCount: configToUse.messages?.length || 0,
        messagesPreview: configToUse.messages?.slice(0, 2).map(m => ({ sender: m.sender, text: m.text?.substring(0, 50) + '...' })),
        peopleNames: {
          left: configToUse.people?.left?.name,
          right: configToUse.people?.right?.name
        },
        template: configToUse.template,
        chatOverlay: configToUse.chatOverlay ? {
          width: configToUse.chatOverlay.width,
          height: configToUse.chatOverlay.height,
          fontSize: configToUse.chatOverlay.fontSize
        } : 'none',
        usingCachedUrls: !!processedConfig
      });

      // ✅ FIXED: Direct config passthrough - no transformation needed!
      // CleanTextStoryComposition accepts TextStoryConfig directly
      console.log('[VideoService] ✅ Passing config directly to text-story composition:', {
        title: configToUse.title,
        messagesCount: configToUse.messages?.length,
        hasColorCustomization: !!configToUse.colorCustomization,
        hasBackgroundSettings: !!configToUse.backgroundSettings,
        hasChatOverlay: !!configToUse.chatOverlay,
        configKeys: Object.keys(configToUse),
        cacheProcessed: !!processedConfig
      });

      
      // ✅ COMPLETE CONFIGURATION TEMPLATE: Use tested working config structure
      const completeConfig = {
        ...configToUse,
        
        // Core required settings with working defaults
        template: configToUse.template || 'modern-light',
        
        // Animation settings - complete structure
        animationSettings: {
          messageAnimationType: 'slide',
          animationSpeed: 'normal',
          transitionDuration: 500,
          baseDelay: 1000,
          messageDelay: 2000,
          bounceIntensity: 0.5,
          enablePhysics: false,
          swipeAnimations: false,
          parallaxEffect: false,
          morphingText: false,
          showMessageAnimations: true,
          ...configToUse.animationSettings
        },
        
        // Background settings with complete structure
        backgroundSettings: {
          backgroundType: 'gradient',
          backgroundUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundOpacity: 100,
          backgroundBlur: false,
          greenScreen: false,
          musicVolume: 0,
          videoVolume: 0,
          ...configToUse.backgroundSettings
        },
        
        // Color customization - complete structure
        colorCustomization: {
          accentColor: '#007AFF',
          primaryColor: '#000000',
          secondaryColor: '#FFFFFF',
          backgroundColor: '#F0F0F0',
          textColor: '#000000',
          bubbleColorLeft: '#E5E5EA',
          bubbleColorRight: '#007AFF',
          textColorLeft: '#000000',
          textColorRight: '#FFFFFF',
          ...configToUse.colorCustomization
        },
        
        // Chat overlay settings - complete structure
        chatOverlay: {
          width: 350,
          height: 600,
          horizontalPosition: 'center', // ✅ CRITICAL: This was missing
          verticalPosition: 'center',
          fontSize: 16,
          borderRadius: 18,
          opacity: 100,
          padding: 20,
          backgroundColor: 'rgba(255,255,255,0.95)',
          ...configToUse.chatOverlay
        },
        
        // Voice audio settings
        voiceAudioSettings: {
          voiceVolume: 100,
          masterVolume: 80,
          enableAudio: false, // Disable to avoid audio loading issues in test
          ...configToUse.voiceAudioSettings
        },
        
        // Video settings
        videoSettings: {
          duration: settings.duration || 10,
          resolution: '1080x1920',
          fps: 30,
          quality: 'high',
          greenScreen: false,
          brainrotMode: false,
          ...configToUse.videoSettings
        },
        
        // Visual effects settings
        visualEffectsSettings: {
          screenShake: false,
          particleEffects: false,
          glitchEffects: false,
          messageGlow: false,
          pulseEffects: false,
          backgroundBlur: false,
          neonEffects: false,
          matrixRain: false,
          fireEffects: false,
          hologramMode: false,
          ...configToUse.visualEffectsSettings
        },
        
        // Notification settings
        notificationSettings: {
          showNotifications: false, // Disable to avoid audio/notification issues
          notificationStyle: 'ios',
          soundEnabled: false,
          vibrationEnabled: false,
          animationType: 'slide',
          ...configToUse.notificationSettings
        },
        
        // Chat simulation settings
        chatSimulationSettings: {
          showReadReceipts: true,
          showTypingIndicators: true,
          showTimestamps: false,
          enableReactions: false,
          simulateDelay: true,
          showOnlineStatus: false,
          showLastSeen: false,
          enableMessageSearch: false,
          showMessageStatus: true,
          simulateNetworkDelay: false,
          ...configToUse.chatSimulationSettings
        },
        
        // Captions
        captions: {
          enabled: false,
          autoGenerate: false,
          language: 'en',
          style: {
            fontSize: 16,
            fontFamily: 'Arial',
            fontColor: '#FFFFFF',
            backgroundColor: '#000000',
            backgroundOpacity: 0.7,
            position: 'bottom',
            animation: 'fade'
          },
          lines: [],
          ...configToUse.captions
        }
      };
      
      console.log('[VideoService] ✅ Complete configuration with defaults applied:', {
        hasAnimationSettings: !!completeConfig.animationSettings,
        hasBaseDelay: !!completeConfig.animationSettings?.baseDelay,
        hasNotificationSettings: !!completeConfig.notificationSettings,
        hasChatSimulationSettings: !!completeConfig.chatSimulationSettings
      });

      // Return the complete config with a config wrapper for Remotion
      return {
        config: completeConfig // Pass the complete TextStoryConfig with all defaults
      };
    }

    // ❌ NO FALLBACKS - Enhanced config is required
    console.error('[VideoService] ❌ CRITICAL: No enhanced config provided!', {
      hasInputConfig: !!input.config,
      hasProcessedConfig: !!processedConfig,
      inputKeys: Object.keys(input),
      inputText: input.text?.substring(0, 100) + '...'
    });

    throw new Error('Enhanced config is required for video generation. Legacy text parsing has been removed. Please use generateVideoFromConfig() from the frontend.');
  }

  // ❌ DEPRECATED: This function is no longer used since we now pass config directly to text-story composition
  // TODO: Remove this entire function in a future cleanup
  private transformEnhancedConfigToChatReel(config: any, settings: any): any {
    console.log('[VideoService] 🔄 Transforming enhanced config to ChatReel format');
    console.log('[VideoService] Raw input config structure:', {
      configKeys: Object.keys(config),
      title: config.title,
      messagesCount: config.messages?.length,
      peopleStructure: {
        hasPeople: !!config.people,
        left: config.people?.left ? {
          name: config.people.left.name,
          hasAvatar: !!config.people.left.avatar
        } : null,
        right: config.people?.right ? {
          name: config.people.right.name,
          hasAvatar: !!config.people.right.avatar
        } : null
      },
      template: config.template,
      background: config.background,
      hasChatOverlay: !!config.chatOverlay
    });

    // Direct template passthrough - ChatReel now supports all frontend templates
    const templateToUIMap: { [key: string]: string } = {
      // Modern themes
      'modern-dark': 'modern-dark',
      'modern-light': 'modern-light',

      // iOS/iMessage themes
      'ios-style': 'ios-style',
      'ios-light': 'ios-light',
      'ios-dark': 'ios-dark',

      // Instagram themes
      'instagram-dm': 'instagram-dm',
      'instagram-light': 'instagram-light',
      'instagram-dark': 'instagram-dark',

      // WhatsApp themes
      'whatsapp-light': 'whatsapp-light',
      'whatsapp-dark': 'whatsapp-dark',
      'whatsapp-white': 'whatsapp-white',

      // Other platforms
      'telegram': 'telegram',
      'discord-style': 'discord-style',
      'facebook-messenger': 'facebook-messenger',
      'twitter-dm': 'twitter-dm',
      'tinder-light': 'tinder-light',
      'tinder-dark': 'tinder-dark'
    };

    // Ensure we have messages and people data
    console.log('[VideoService] 🔍 Checking config data structure:', {
      hasMessages: !!config.messages,
      messagesLength: config.messages?.length || 0,
      messagesArray: config.messages,
      hasPeople: !!config.people,
      peopleKeys: config.people ? Object.keys(config.people) : []
    });

    if (!config.messages || !config.people) {
      console.error('[VideoService] ❌ Missing required data in enhanced config:', {
        hasMessages: !!config.messages,
        messagesLength: config.messages?.length || 0,
        hasPeople: !!config.people
      });
      throw new Error('Enhanced config missing messages or people data');
    }

    if (config.messages.length === 0) {
      console.error('[VideoService] ❌ Messages array is empty!', {
        messagesArray: config.messages,
        configKeys: Object.keys(config)
      });
      throw new Error('Enhanced config has empty messages array');
    }

    // Transform messages from frontend format to ChatReel format
    console.log('[VideoService] 📝 Processing messages for ChatReel...', {
      totalMessages: config.messages.length,
      firstMessage: config.messages[0] ? {
        id: config.messages[0].id,
        sender: config.messages[0].sender,
        text: config.messages[0].text?.substring(0, 50) + '...'
      } : 'none'
    });

    const processedMessages = config.messages.map((msg: any, index: number) => {
      const processed = {
        id: msg.id,
        text: msg.text,
        from: msg.sender === 'left' ? 'sender' : 'receiver', // Map left/right to sender/receiver
        prevFrom: index > 0 ? (config.messages[index - 1].sender === 'left' ? 'sender' : 'receiver') : null,
        nextFrom: index < config.messages.length - 1 ? (config.messages[index + 1].sender === 'left' ? 'sender' : 'receiver') : null,
        voiceId: msg.voiceId || 'default-voice',
        duration: msg.audioDuration || 2.0,
        soundEffect: '',
        soundEffectStart: '',
        soundEffectDuration: 0,
        audioUrl: msg.audioUrl || ''
      };

      console.log(`[VideoService] Message ${index + 1}:`, {
        original: { sender: msg.sender, text: msg.text?.substring(0, 30) + '...' },
        transformed: { from: processed.from, text: processed.text?.substring(0, 30) + '...' }
      });

      return processed;
    });

    // Extract user names - CRITICAL: Use actual user-provided names
    const leftPersonName = config.people.left?.name || 'Person A';
    const rightPersonName = config.people.right?.name || 'Person B';
    const leftPersonAvatar = config.people.left?.avatar?.url || '';
    const rightPersonAvatar = config.people.right?.avatar?.url || '';

    console.log('[VideoService] Using user-provided names:', {
      left: leftPersonName,
      right: rightPersonName,
      leftAvatar: leftPersonAvatar,
      rightAvatar: rightPersonAvatar
    });

    // Create ChatReel conversation structure
    const conversation = {
      id: 'enhanced-conversation',
      name: config.title || 'Enhanced Chat Story',
      messages: [], // Original messages not used in rendering
      processedMessages: processedMessages,
      messageMetadata: {
        username: leftPersonName, // Use actual user-provided name
        pfp: leftPersonAvatar, // Use actual user-provided avatar
        darkMode: config.template?.includes('dark') || false,
        unreadMessages: (config.videoSettings?.unreadMessagesCount || 0).toString(),
        radiusValue: config.chatOverlay?.borderRadius || 18,
        playbackRate1: config.audioSettings?.voicePlaybackRate || 1.1,
        playbackRate2: config.audioSettings?.voicePlaybackRate || 1.1,
        ui: templateToUIMap[config.template] || config.template || 'modern-light',
        opacity: config.chatOverlay?.opacity || 100,
        greenScreen: config.videoSettings?.greenScreen || false,
        isBrainrot: config.videoSettings?.brainrotMode || false
      },
      voice1Settings: {
        selectedVoiceId: config.people?.left?.voiceId || 'voice1',
        stability: config.audioSettings?.voiceStability || 50,
        similarity: config.audioSettings?.voiceSimilarity || 75,
        playbackRate: config.audioSettings?.voicePlaybackRate || 1.1,
        pitch: config.audioSettings?.voicePitch || 1
      },
      voice2Settings: {
        selectedVoiceId: config.people?.right?.voiceId || 'voice2',
        stability: config.audioSettings?.voiceStability || 50,
        similarity: config.audioSettings?.voiceSimilarity || 75,
        playbackRate: config.audioSettings?.voicePlaybackRate || 1.1,
        pitch: config.audioSettings?.voicePitch || 1
      },
      messageDelay: config.animationSettings?.messageDelay || 0
    };

    console.log('[VideoService] Created ChatReel conversation:', {
      username: conversation.messageMetadata.username,
      messagesCount: conversation.processedMessages.length,
      ui: conversation.messageMetadata.ui
    });

    // Return ChatReel composition props with ALL dynamic settings
    const chatReelProps = {
      videoId: `enhanced_${Date.now()}`,
      conversation: conversation,
      enableAudio: config.audioSettings?.enableAudio ?? true,
      masterVolume: (config.audioSettings?.masterVolume ?? 80) / 100, // Convert 0-100 to 0-1
      showNotifications: config.animationSettings?.showNotifications ?? true,
      showTypingIndicators: config.animationSettings?.showTypingIndicators ?? true,
      showMessageAnimations: config.animationSettings?.showMessageAnimations ?? true,
      baseDelay: config.animationSettings?.baseDelay ?? 1000,
      duration: config.videoSettings?.duration ?? 30,

      // Pass overlay settings to composition
      overlaySettings: {
        ...config.chatOverlay,
        colorCustomization: config.colorCustomization
      },

      // NEW: Pass all advanced customization settings
      notificationSettings: config.notificationSettings || {
        showNotifications: true,
        notificationStyle: 'ios',
        soundEnabled: true,
        vibrationEnabled: true,
        animationType: 'slide'
      },

      chatSimulationSettings: config.chatSimulationSettings || {
        showReadReceipts: true,
        showTypingIndicators: true,
        showTimestamps: false,
        enableReactions: false,
        simulateDelay: true,
        showOnlineStatus: true,
        showLastSeen: true,
        enableMessageSearch: false,
        showMessageStatus: true,
        simulateNetworkDelay: false
      },

      visualEffectsSettings: config.visualEffectsSettings || {
        screenShake: false,
        particleEffects: false,
        glitchEffects: false,
        messageGlow: false,
        pulseEffects: true,
        backgroundBlur: false,
        neonEffects: false,
        matrixRain: false,
        fireEffects: false,
        hologramMode: false
      },

      // Caption settings for subtitles/captions
      captionSettings: config.captions || {
        enabled: false,
        autoGenerate: true,
        language: 'en',
        style: {
          fontSize: 16,
          fontFamily: 'Arial',
          fontColor: '#FFFFFF',
          backgroundColor: '#000000',
          backgroundOpacity: 0.7,
          position: 'bottom',
          animation: 'fade'
        },
        lines: []
      },

      // Advanced settings for special modes
      advancedSettings: config.advancedSettings || {
        greenScreenMode: false,
        brainrotMode: false,
        highQualityMode: true,
        memoryOptimization: false,
        parallelRendering: false
      },

      // Enhanced animation settings
      enhancedAnimationSettings: config.animationSettings || {
        messageAnimationType: 'fade',
        animationSpeed: 'normal',
        transitionDuration: 300,
        enablePhysics: false,
        bounceIntensity: 1.0,
        swipeAnimations: false,
        parallaxEffect: false,
        morphingText: false
      }
    };

    return chatReelProps;
  }

  async generateVideo(
    request: VideoGenerationRequest,
    onProgress?: ProgressCallback,
    frontendSocketId?: string
  ): Promise<VideoGenerationResult> {
    console.log('[VideoService] DEBUG - videoServicePath:', this.videoServicePath);
    
    // NEW: Check if multi-tier processing is enabled
    const useMultiTier = process.env.ENABLE_MULTI_TIER_PROCESSING === 'true';
    
    if (useMultiTier) {
      console.log('[VideoService] 🚀 Using multi-tier video processing orchestrator');
      const { videoProcessingOrchestrator } = await import('./videoProcessingOrchestrator');
      
      const orchestratorResult = await videoProcessingOrchestrator.processVideo(
        {
          type: request.type,
          input: request.input,
          settings: request.settings,
          userId: request.userId,
          priority: 'medium',
          options: {
            enableFallback: true,
            maxTimeMinutes: 15
          }
        },
        (progress) => {
          if (onProgress) {
            onProgress({
              phase: progress.phase as any,
              progress: progress.progress,
              message: progress.message || ''
            });
          }
        }
      );
      
      if (orchestratorResult.success) {
        return {
          success: true,
          videoUrl: orchestratorResult.videoUrl!,
          outputPath: orchestratorResult.videoUrl!,
          sizeInBytes: orchestratorResult.performance.sizeInBytes || 0,
          durationInSeconds: orchestratorResult.performance.processingTimeMs / 1000,
          renderTimeMs: orchestratorResult.performance.processingTimeMs,
          cacheInfo: orchestratorResult.preprocessing ? {
            hadR2Videos: orchestratorResult.preprocessing.applied,
            cachedUrls: 1,
            cacheProcessingTimeMs: orchestratorResult.preprocessing.timeMs,
            urlMappings: {}
          } : {
            hadR2Videos: false,
            cachedUrls: 0,
            cacheProcessingTimeMs: 0,
            urlMappings: {}
          }
        };
      } else {
        throw new Error(orchestratorResult.error || 'Multi-tier video processing failed');
      }
    }
    
    console.log('[VideoService] DEBUG - Lambda detection:', {
      startsWithHttps: this.videoServicePath.startsWith('https://'),
      includesS3: this.videoServicePath.includes('s3.amazonaws.com'),
      includesRemotionLambda: this.videoServicePath.includes('remotionlambda-'),
      willUseLambda: this.videoServicePath.startsWith('https://') && (this.videoServicePath.includes('s3.amazonaws.com') || this.videoServicePath.includes('remotionlambda-')),
      fullPath: this.videoServicePath
    });
    
    // Check if using Lambda video service (S3 site URL indicates Lambda deployment)
    if (this.videoServicePath.startsWith('https://') && (this.videoServicePath.includes('s3.amazonaws.com') || this.videoServicePath.includes('remotionlambda-'))) {
      console.log('[VideoService] ⚡ Using Lambda video service for generation');
      const { lambdaVideoService } = await import('./lambdaVideoService');
      
      const lambdaResult = await lambdaVideoService.generateVideo(request, (progress) => {
        if (onProgress) {
          onProgress({
            phase: progress.phase as any,
            progress: progress.progress,
            message: progress.message || ''
          });
        }
      });

      if (!lambdaResult.success) {
        throw new Error(lambdaResult.error || 'Lambda video generation failed');
      }

      return {
        success: true,
        videoUrl: lambdaResult.videoUrl!,
        outputPath: lambdaResult.videoUrl!,
        sizeInBytes: lambdaResult.sizeInBytes || 0,
        durationInSeconds: lambdaResult.durationInSeconds || 0,
        renderTimeMs: (lambdaResult.renderTime || 0) * 1000,
        cacheInfo: { 
          hadR2Videos: false, 
          cachedUrls: 0, 
          cacheProcessingTimeMs: 0, 
          urlMappings: {} 
        }
      };
    }
    
    // Check if using traditional remote video service (WebSocket-based)
    if (this.videoServicePath.startsWith('http://') || (this.videoServicePath.startsWith('https://') && !this.videoServicePath.includes('s3.amazonaws.com'))) {
      console.log('[VideoService] 🌐 Using remote video service for generation');
      const { remoteVideoService } = await import('./remoteVideoService');
      return remoteVideoService.generateVideo(request, onProgress, frontendSocketId);
    }
    
    const startTime = Date.now();
    const videoId = `${request.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const outputPath = path.join(this.rendersDir, `${videoId}.mp4`);

    // Declare variables outside try block so they're accessible in catch
    let bundleLocation: string;
    let composition: any;
    let inputProps: any;
    let cacheInfo: VideoGenerationResult['cacheInfo'];

    try {
      console.log(`[VideoService] Starting video generation with R2 cache:`, {
        type: request.type,
        userId: request.userId,
        videoId
      });

      // Phase 0: Cache Processing (NEW)
      console.log('[VideoService] 🚀 Phase 0: R2 Video Cache Processing...');
      const cacheProcessing = await this.processConfigForCaching(request, onProgress);
      
      cacheInfo = {
        hadR2Videos: cacheProcessing.cacheResult.hasR2Urls,
        cachedUrls: cacheProcessing.cacheResult.r2Urls.length,
        cacheProcessingTimeMs: cacheProcessing.processingTimeMs,
        urlMappings: cacheProcessing.cacheResult.urlMappings
      };

      console.log('[VideoService] ✅ Cache processing completed:', cacheInfo);

      // Phase 1: Bundling
      onProgress?.({
        phase: 'bundling',
        progress: 20,
        message: 'Preparing Remotion bundle...'
      });

      bundleLocation = await this.getBundle();

      onProgress?.({
        phase: 'bundling',
        progress: 35,
        message: 'Bundle ready, getting composition...'
      });

      // Phase 2: Get composition (with processed config)
      const compositionId = this.getCompositionId(request.type);
      inputProps = this.prepareInputProps(request, cacheProcessing.processedConfig);

      console.log(`[VideoService] 🎯 COMPOSITION SELECTION DEBUG:`);
      console.log(`[VideoService] Request type: "${request.type}"`);
      console.log(`[VideoService] Selected composition ID: "${compositionId}"`);
      console.log(`[VideoService] Input props overview:`, {
        hasConfig: !!inputProps.config,
        propsKeys: Object.keys(inputProps)
      });

      composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps,
      });

      console.log(`[VideoService] Composition selected:`, {
        id: composition.id,
        width: composition.width,
        height: composition.height,
        fps: composition.fps,
        durationInFrames: composition.durationInFrames
      });

      onProgress?.({
        phase: 'rendering',
        progress: 45,
        message: `Rendering ${composition.durationInFrames} frames${cacheInfo?.hadR2Videos ? ' (using cached videos)' : ''}...`
      });

      // Phase 3: Render video with cached R2 videos (should be much faster now!)
      const renderResult = await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        // ✅ REDUCED TIMEOUT: With cached videos, we don't need as long
        timeoutInMilliseconds: cacheInfo?.hadR2Videos ? 60000 : 120000, // 1 min for cached, 2 min for uncached
        onProgress: ({ renderedFrames, encodedFrames, progress: renderProgress }) => {
          const totalFrames = composition.durationInFrames;
          const progress = Math.round(renderProgress * 45) + 45; // 45-90%
          onProgress?.({
            phase: 'rendering',
            progress,
            message: `Rendered ${renderedFrames}/${totalFrames} frames${cacheInfo?.hadR2Videos ? ' (cached)' : ''}`,
            renderedFrames,
            totalFrames
          });
        },
        onDownload: (src) => {
          console.log(`[VideoService] ${cacheInfo?.hadR2Videos ? 'Serving cached video' : 'Downloaded'}: ${src}`);
        },
      });

      onProgress?.({
        phase: 'encoding',
        progress: 95,
        message: 'Finalizing video...'
      });

      // Get file stats
      const stats = await fs.stat(outputPath);
      const renderTimeMs = Date.now() - startTime;

      console.log(`[VideoService] Video generated successfully:`, {
        outputPath,
        sizeInBytes: stats.size,
        renderTimeMs,
        videoId
      });

      onProgress?.({
        phase: 'completed',
        progress: 100,
        message: 'Video generation completed!'
      });

      return {
        success: true,
        outputPath,
        sizeInBytes: stats.size,
        durationInSeconds: composition.durationInFrames / composition.fps,
        width: composition.width,
        height: composition.height,
        renderTimeMs,
        cacheInfo
      };

    } catch (error) {
      // Enhanced error logging and handling for R2 download issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isR2DownloadError = errorMessage.includes('Error while downloading') && 
                                errorMessage.includes('.r2.dev');
      const isAggregateError = errorMessage.includes('AggregateError') || 
                               errorMessage.includes('internalConnectMultiple');
      
      if ((isR2DownloadError || isAggregateError) && bundleLocation && composition && inputProps) {
        console.error(`[VideoService] 🚨 R2 Download Error Detected:`, {
          errorType: isAggregateError ? 'AggregateError' : 'R2DownloadError',
          errorMessage: errorMessage.substring(0, 200) + '...',
          timestamp: new Date().toISOString(),
          suggestion: 'Video will be generated with gradient background fallback'
        });
        
        // For R2 errors, try generating without video background
        console.log('[VideoService] 🔄 Retrying video generation with fallback settings...');
        
        try {
          // Modify input props to use gradient background instead of video
          const fallbackInputProps = {
            ...inputProps,
            config: {
              ...inputProps.config,
              backgroundSettings: {
                ...inputProps.config.backgroundSettings,
                backgroundType: 'gradient',
                backgroundUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundOpacity: 100,
                backgroundBlur: false
              }
            }
          };
          
          console.log('[VideoService] 🎨 Using gradient fallback for background');
          
          // Retry render with fallback settings
          const fallbackResult = await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation: outputPath,
            inputProps: fallbackInputProps,
            // ✅ CRITICAL: Add timeout for fallback rendering too
            timeoutInMilliseconds: 120000, // 2 minutes
            onProgress: ({ renderedFrames, encodedFrames, progress: renderProgress }) => {
              const totalFrames = composition.durationInFrames;
              const progress = Math.round(renderProgress * 60) + 30; // 30-90%
              onProgress?.({
                phase: 'rendering',
                progress,
                message: `Rendering with fallback background... ${renderedFrames}/${totalFrames}`,
                renderedFrames,
                totalFrames
              });
            }
          });
          
          console.log('[VideoService] ✅ Fallback render completed successfully');
          
          const stats = await fs.stat(outputPath);
          const renderTimeMs = Date.now() - startTime;
          
          return {
            success: true,
            outputPath,
            sizeInBytes: stats.size,
            durationInSeconds: composition.durationInFrames / composition.fps,
            width: composition.width,
            height: composition.height,
            renderTimeMs,
            cacheInfo
          };
          
        } catch (fallbackError) {
          console.error('[VideoService] ❌ Fallback render also failed:', fallbackError);
          // Fall through to original error handling
        }
      }
      
      console.error(`[VideoService] Generation failed:`, {
        errorMessage,
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        inputType: request.type,
        timestamp: new Date().toISOString()
      });

      // Clean up partial files
      try {
        await fs.unlink(outputPath);
      } catch {
        // File might not exist
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during video generation'
      };
    }
  }

  async getVideoMetadata(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        sizeInBytes: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch {
      return {
        exists: false
      };
    }
  }

  async listRenderedVideos(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.rendersDir);
      return files.filter(file => file.endsWith('.mp4'));
    } catch {
      return [];
    }
  }

  async deleteVideo(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.rendersDir, fileName);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Prepare for Lambda integration
  async prepareLambdaPayload(request: VideoGenerationRequest) {
    return {
      functionName: 'remotion-render',
      inputProps: this.prepareInputProps(request),
      composition: this.getCompositionId(request.type),
      codec: 'h264' as const,
      region: 'us-east-1' // Will be configured via centralized config
    };
  }
}

// Export singleton instance
export const videoService = new VideoService();

// Export for legacy compatibility
export const createRemotionService = () => videoService;
export const getRemotionService = () => videoService;
