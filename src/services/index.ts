// AI Services Export Module
// This module provides centralized access to all AI and cloud services

// OpenAI Service - GPT-4 integration
export {
  default as OpenAIService,
  _createOpenAIService,
  _getOpenAIService,
  type OpenAIConfig,
  type ScriptGenerationRequest,
  type ScriptGenerationResponse,
  type ContentOptimizationRequest,
  type TrendAnalysisRequest,
  type QuizQuestion,
  type QuizGenerationRequest,
} from './openai';

// ElevenLabs Service - Voice generation
export {
  default as ElevenLabsService,
  _createElevenLabsService,
  _getElevenLabsService,
  type ElevenLabsConfig,
  type Voice,
  type VoiceSettings,
  type TextToSpeechRequest,
  type AudioGenerationResponse,
  type SupportedLanguage,
  VOICE_PRESETS,
  SUPPORTED_LANGUAGES,
} from './elevenlabs';

// Whisper Service - Caption generation
export {
  default as WhisperService,
  _createWhisperService,
  _getWhisperService,
  type WhisperConfig,
  type TranscriptionRequest,
  type TranscriptionResponse,
  type CaptionOptions,
  type Caption,
  WHISPER_LANGUAGES,
} from './whisper';

// DALL-E Service - AI image generation
export {
  default as DalleService,
  _createDalleService,
  _getDalleService,
  type DalleConfig,
  type ImageGenerationRequest,
  type GeneratedImage,
  type VideoBackgroundRequest,
  type ThumbnailRequest,
  type StoryIllustrationRequest,
} from './dalle';

// S3 Service - AWS S3 integration
export {
  default as S3Service,
  _createS3Service,
  _getS3Service,
  type S3Config,
  type UploadOptions,
  type UploadResult,
  type DownloadOptions,
  type ListObjectsOptions,
  type S3Object,
  type SignedUrlOptions,
} from './s3';

// Remotion Service - Video rendering
export {
  default as RemotionService,
  _createRemotionService,
  _getRemotionService,
  type RemotionConfig,
  type RenderRequest,
  type VideoTemplate,
  type RenderProgress,
  type RenderResult,
  type StoryVideoProps,
  type RedditVideoProps,
  type QuizVideoProps,
  VIDEO_TEMPLATES,
} from './remotion';

// Import service creation functions for internal use
import { _createOpenAIService as __createOpenAIService, _getOpenAIService as __getOpenAIService } from './openai';
import { _createElevenLabsService as __createElevenLabsService, _getElevenLabsService as __getElevenLabsService } from './elevenlabs';
import { _createWhisperService as __createWhisperService, _getWhisperService as __getWhisperService } from './whisper';
import { _createDalleService as __createDalleService, _getDalleService as __getDalleService } from './dalle';
import { _createS3Service as __createS3Service, _getS3Service as __getS3Service } from './s3';
import { _createRemotionService as __createRemotionService, _getRemotionService as __getRemotionService } from './remotion';

// Service initialization and management
export interface AIServicesConfig {
  openai: {
    apiKey: string;
    organization?: string;
  };
  elevenlabs: {
    apiKey: string;
  };
  whisper: {
    apiKey: string; // Same as OpenAI
  };
  dalle: {
    apiKey: string; // Same as OpenAI
  };
  s3: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucketName: string;
  };
  remotion: {
    compositionsPath: string;
    outputDir: string;
    lambdaRegion?: string;
    lambdaRole?: string;
  };
}

// Initialize all services with configuration
export function initializeAIServices(config: AIServicesConfig) {
  try {
    console.log('[AI Services] Initializing all AI services...');

    // Initialize OpenAI Service
    _createOpenAIService({
      apiKey: config.openai.apiKey,
      organization: config.openai.organization,
      maxRetries: 3,
      timeout: 60000,
    });

    // Initialize ElevenLabs Service
    _createElevenLabsService({
      apiKey: config.elevenlabs.apiKey,
      maxRetries: 3,
      timeout: 30000,
    });

    // Initialize Whisper Service (uses OpenAI)
    _createWhisperService({
      apiKey: config.whisper.apiKey,
      maxRetries: 3,
      timeout: 120000,
    });

    // Initialize DALL-E Service (uses OpenAI)
    _createDalleService({
      apiKey: config.dalle.apiKey,
      maxRetries: 3,
      timeout: 60000,
    });

    // Initialize S3 Service
    _createS3Service({
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      region: config.s3.region,
      bucketName: config.s3.bucketName,
    });

    // Initialize Remotion Service
    _createRemotionService({
      compositionsPath: config.remotion.compositionsPath,
      outputDir: config.remotion.outputDir,
      lambdaRegion: config.remotion.lambdaRegion,
      lambdaRole: config.remotion.lambdaRole,
      concurrency: 4,
      quality: 80,
    });

    console.log('[AI Services] All services initialized successfully');
  } catch (error) {
    console.error('[AI Services] Failed to initialize services:', error);
    throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test all services connectivity
export async function testAllServices(): Promise<{ [service: string]: boolean }> {
  const results: { [service: string]: boolean } = {};

  try {
    console.log('[AI Services] Testing service connectivity...');

    // Test OpenAI
    try {
      const openai = _getOpenAIService();
      results.openai = await openai.testConnection();
    } catch (error) {
      console.warn('[AI Services] OpenAI service not initialized');
      results.openai = false;
    }

    // Test ElevenLabs
    try {
      const elevenlabs = _getElevenLabsService();
      results.elevenlabs = await elevenlabs.testConnection();
    } catch (error) {
      console.warn('[AI Services] ElevenLabs service not initialized');
      results.elevenlabs = false;
    }

    // Test Whisper
    try {
      const whisper = _getWhisperService();
      results.whisper = await whisper.testConnection();
    } catch (error) {
      console.warn('[AI Services] Whisper service not initialized');
      results.whisper = false;
    }

    // Test DALL-E
    try {
      const dalle = _getDalleService();
      results.dalle = await dalle.testConnection();
    } catch (error) {
      console.warn('[AI Services] DALL-E service not initialized');
      results.dalle = false;
    }

    // Test S3
    try {
      const s3 = _getS3Service();
      results.s3 = await s3.testConnection();
    } catch (error) {
      console.warn('[AI Services] S3 service not initialized');
      results.s3 = false;
    }

    // Test Remotion
    try {
      const remotion = _getRemotionService();
      results.remotion = await remotion.testConnection();
    } catch (error) {
      console.warn('[AI Services] Remotion service not initialized');
      results.remotion = false;
    }

    console.log('[AI Services] Service connectivity test completed:', results);
    return results;
  } catch (error) {
    console.error('[AI Services] Service test failed:', error);
    throw new Error(`Service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility functions for common workflows
export class AIWorkflowUtils {
  static async generateVideoScript(
    topic: string,
    videoType: 'story' | 'reddit' | 'quiz' | 'educational' | 'viral',
    duration: number,
    language: string = 'en'
  ) {
    const openai = _getOpenAIService();
    return await openai.generateScript({
      videoType,
      topic,
      duration,
      language,
      tone: 'engaging',
    });
  }

  static async generateVoiceOver(
    text: string,
    language: string = 'en',
    gender: 'male' | 'female' = 'female',
    style: 'professional' | 'casual' | 'energetic' = 'professional'
  ) {
    const elevenlabs = _getElevenLabsService();
    const voiceId = elevenlabs.getSuggestedVoice(language, gender, style);
    const voiceSettings = elevenlabs.getOptimalVoiceSettings(language);

    return await elevenlabs.generateSpeech({
      text,
      voice_id: voiceId,
      voice_settings: voiceSettings,
    });
  }

  static async generateCaptions(
    audioFile: string | Buffer,
    language?: string
  ) {
    const whisper = _getWhisperService();
    return await whisper.generateWebVTT(audioFile, {
      maxLineLength: 40,
      maxLinesPerCaption: 2,
      wordLevelSync: true,
    });
  }

  static async generateVideoBackground(
    theme: string,
    mood: string,
    aspectRatio: '16:9' | '9:16' | '1:1' = '9:16'
  ) {
    const dalle = _getDalleService();
    return await dalle.generateVideoBackground({
      theme: theme as any,
      mood: mood as any,
      style: 'cinematic',
      aspectRatio,
    });
  }

  static async uploadAsset(
    filePath: string,
    userId: string,
    assetType: 'audio' | 'image' | 'font' | 'subtitle'
  ) {
    const s3 = _getS3Service();
    const fileName = require('path').basename(filePath);
    const key = s3.generateAssetKey(userId, assetType, fileName);

    return await s3.uploadFile(filePath, {
      key,
      acl: 'private',
      storageClass: 'STANDARD',
    });
  }

  static async renderCompleteVideo(
    templateId: string,
    props: any,
    userId: string,
    videoId: string
  ) {
    const remotion = _getRemotionService();
    const s3 = _getS3Service();

    // Render video
    const renderResult = await remotion.renderFromTemplate(templateId, props);

    if (renderResult.success) {
      // Upload to S3
      const videoKey = s3.generateVideoKey(userId, videoId);
      const uploadResult = await s3.uploadFile(renderResult.outputPath, {
        key: videoKey,
        contentType: 'video/mp4',
        acl: 'private',
      });

      return {
        ...renderResult,
        s3Location: uploadResult.location,
        s3Key: uploadResult.key,
      };
    }

    return renderResult;
  }
}

// Export the utility class
export default AIWorkflowUtils;