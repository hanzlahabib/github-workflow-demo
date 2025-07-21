// Native Video Service - No shell commands, 100% Node.js
// Uses Remotion programmatic API for video generation
// Ready for Lambda integration

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { RenderInternals } from '@remotion/renderer';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';

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
  sizeInBytes?: number;
  durationInSeconds?: number;
  width?: number;
  height?: number;
  renderTimeMs?: number;
  error?: string;
}

export interface ProgressCallback {
  (progress: {
    phase: 'bundling' | 'rendering' | 'encoding' | 'completed';
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

  constructor() {
    this.videoServicePath = path.resolve(__dirname, '../../../reelspeed-video-service');
    this.rendersDir = path.join(this.videoServicePath, 'renders');
    this.ensureRendersDirectory();
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
    if (this.bundlePath) {
      return this.bundlePath;
    }

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
      story: 'ChatReel', // Use ChatReel for story type with enhanced config support
      reddit: 'RedditVideo',
      quiz: 'QuizVideo',
      educational: 'EducationalVideo'
    };

    const selectedComposition = compositionMap[type] || 'ChatReel';

    console.log(`[VideoService] 🎬 COMPOSITION MAPPING DEBUG:`);
    console.log(`[VideoService] Input type: "${type}"`);
    console.log(`[VideoService] Available mappings:`, compositionMap);
    console.log(`[VideoService] Selected composition: "${selectedComposition}"`);
    console.log(`[VideoService] ✅ This should be "ChatReel" for enhanced config support`);

    return selectedComposition;
  }

  public prepareInputProps(request: VideoGenerationRequest): any {
    const { input, settings, type } = request;

    console.log('[VideoService] 🔍 prepareInputProps called with FULL request:', {
      type,
      requestKeys: Object.keys(request),
      input: input,
      inputKeys: Object.keys(input),
      hasInputConfig: !!input.config,
      configKeys: input.config ? Object.keys(input.config) : 'no config',
      settingsKeys: Object.keys(settings)
    });

    // PRIORITY: Check if we have enhanced config from frontend
    if (input.config) {
      console.log('[VideoService] ✅ Enhanced config detected! Details:', {
        title: input.config.title,
        messagesCount: input.config.messages?.length || 0,
        messagesPreview: input.config.messages?.slice(0, 2).map(m => ({ sender: m.sender, text: m.text?.substring(0, 50) + '...' })),
        peopleNames: {
          left: input.config.people?.left?.name,
          right: input.config.people?.right?.name
        },
        template: input.config.template,
        chatOverlay: input.config.chatOverlay ? {
          width: input.config.chatOverlay.width,
          height: input.config.chatOverlay.height,
          fontSize: input.config.chatOverlay.fontSize
        } : 'none'
      });

      const transformedProps = this.transformEnhancedConfigToChatReel(input.config, settings);
      console.log('[VideoService] ✅ Transformed props for ChatReel:', {
        videoId: transformedProps.videoId,
        conversationId: transformedProps.conversation?.id,
        processedMessagesCount: transformedProps.conversation?.processedMessages?.length || 0,
        messageMetadataUsername: transformedProps.conversation?.messageMetadata?.username,
        ui: transformedProps.conversation?.messageMetadata?.ui,
        hasOverlaySettings: !!transformedProps.overlaySettings
      });

      return transformedProps;
    }

    // ❌ NO FALLBACKS - Enhanced config is required
    console.error('[VideoService] ❌ CRITICAL: No enhanced config provided!', {
      hasInputConfig: !!input.config,
      inputKeys: Object.keys(input),
      inputText: input.text?.substring(0, 100) + '...'
    });

    throw new Error('Enhanced config is required for video generation. Legacy text parsing has been removed. Please use generateVideoFromConfig() from the frontend.');
  }

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

    console.log('[VideoService] Final ChatReel props with ALL settings:', {
      videoId: chatReelProps.videoId,
      conversationUsername: chatReelProps.conversation.messageMetadata.username,
      enableAudio: chatReelProps.enableAudio,
      masterVolume: chatReelProps.masterVolume,
      showNotifications: chatReelProps.showNotifications,
      showTypingIndicators: chatReelProps.showTypingIndicators,
      showMessageAnimations: chatReelProps.showMessageAnimations,
      baseDelay: chatReelProps.baseDelay,
      duration: chatReelProps.duration,
      overlaySettings: chatReelProps.overlaySettings,
      // NEW: Log all advanced settings
      notificationSettings: {
        style: chatReelProps.notificationSettings.notificationStyle,
        soundEnabled: chatReelProps.notificationSettings.soundEnabled,
        animationType: chatReelProps.notificationSettings.animationType
      },
      chatSimulationSettings: {
        readReceipts: chatReelProps.chatSimulationSettings.showReadReceipts,
        typingIndicators: chatReelProps.chatSimulationSettings.showTypingIndicators,
        onlineStatus: chatReelProps.chatSimulationSettings.showOnlineStatus,
        reactions: chatReelProps.chatSimulationSettings.enableReactions
      },
      visualEffectsSettings: {
        screenShake: chatReelProps.visualEffectsSettings.screenShake,
        messageGlow: chatReelProps.visualEffectsSettings.messageGlow,
        particleEffects: chatReelProps.visualEffectsSettings.particleEffects,
        neonEffects: chatReelProps.visualEffectsSettings.neonEffects
      },
      captionSettings: {
        enabled: chatReelProps.captionSettings.enabled,
        language: chatReelProps.captionSettings.language,
        position: chatReelProps.captionSettings.style.position
      },
      advancedSettings: {
        greenScreen: chatReelProps.advancedSettings.greenScreenMode,
        brainrot: chatReelProps.advancedSettings.brainrotMode,
        highQuality: chatReelProps.advancedSettings.highQualityMode
      },
      enhancedAnimationSettings: {
        type: chatReelProps.enhancedAnimationSettings.messageAnimationType,
        speed: chatReelProps.enhancedAnimationSettings.animationSpeed,
        physics: chatReelProps.enhancedAnimationSettings.enablePhysics
      }
    });

    return chatReelProps;
  }

  async generateVideo(
    request: VideoGenerationRequest,
    onProgress?: ProgressCallback
  ): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    const videoId = `${request.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const outputPath = path.join(this.rendersDir, `${videoId}.mp4`);

    try {
      console.log(`[VideoService] Starting video generation:`, {
        type: request.type,
        userId: request.userId,
        videoId
      });

      // Phase 1: Bundling
      onProgress?.({
        phase: 'bundling',
        progress: 5,
        message: 'Preparing Remotion bundle...'
      });

      const bundleLocation = await this.getBundle();

      onProgress?.({
        phase: 'bundling',
        progress: 20,
        message: 'Bundle ready, getting composition...'
      });

      // Phase 2: Get composition
      const compositionId = this.getCompositionId(request.type);
      const inputProps = this.prepareInputProps(request);

      console.log(`[VideoService] 🎯 COMPOSITION SELECTION DEBUG:`);
      console.log(`[VideoService] Request type: "${request.type}"`);
      console.log(`[VideoService] Selected composition ID: "${compositionId}"`);
      console.log(`[VideoService] Should be "ChatReel" for story type`);
      console.log(`[VideoService] Input props overview:`, {
        hasConversation: !!inputProps.conversation,
        hasOverlaySettings: !!inputProps.overlaySettings,
        propsKeys: Object.keys(inputProps)
      });

      const composition = await selectComposition({
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
        progress: 30,
        message: `Rendering ${composition.durationInFrames} frames...`
      });

      // Phase 3: Render video
      const renderResult = await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        onProgress: ({ renderedFrames, encodedFrames, progress: renderProgress }) => {
          const totalFrames = composition.durationInFrames;
          const progress = Math.round(renderProgress * 60) + 30; // 30-90%
          onProgress?.({
            phase: 'rendering',
            progress,
            message: `Rendered ${renderedFrames}/${totalFrames} frames`,
            renderedFrames,
            totalFrames
          });
        },
        onDownload: (src) => {
          console.log(`[VideoService] Downloaded: ${src}`);
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
        renderTimeMs
      };

    } catch (error) {
      console.error(`[VideoService] Generation failed:`, error);

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
