/**
 * Standardized AI Services Module
 * This module provides centralized access to all AI and cloud services using the new standardized patterns
 */

// Export base classes and interfaces
export { BaseService, BaseServiceInterface, type ServiceConfig, type OperationResult } from './BaseService';

// Export configuration types
export type { AIServicesConfig } from '../config/types';
export { ServiceFactory } from './ServiceFactory';
export { ServiceContainer } from './ServiceContainer';
export { ServiceRegistry, SERVICE_TOKENS, type ServiceToken } from './ServiceRegistry';

// Export service classes with standardized patterns
export {
  default as OpenAIService,
  createOpenAIService,
  getOpenAIService,
  type OpenAIConfig,
  type ScriptGenerationRequest,
  type ScriptGenerationResponse,
  type ContentOptimizationRequest,
  type TrendAnalysisRequest,
  type QuizQuestion,
  type QuizGenerationRequest,
} from './openai';

export {
  default as ElevenLabsService,
  createElevenLabsService,
  getElevenLabsService,
  VOICE_PRESETS,
  SUPPORTED_LANGUAGES,
} from './elevenlabs';

export {
  default as WhisperService,
  createWhisperService,
  getWhisperService,
} from './whisper';

export {
  default as DalleService,
  createDalleService,
  getDalleService,
} from './dalle';

export {
  default as S3Service,
  createS3Service,
  getS3Service,
} from './s3';

export {
  default as RemotionService,
  createRemotionService,
  getRemotionService,
} from './remotion';

// Export types from centralized types
export type {
  ElevenLabsConfig,
  Voice,
  TextToSpeechRequest,
  AudioGenerationResponse,
  VoicesListResponse,
  SupportedLanguage,
} from '@/types/services';

// Export cache utilities
export { getCacheService, CacheKeys, CacheTTL } from './cache';

// Import and initialize service registry
import { serviceRegistry, SERVICE_TOKENS } from './ServiceRegistry';

/**
 * NEW STANDARDIZED SERVICE INITIALIZATION
 * Use ServiceRegistry for all service management
 */

// Initialize all services with standardized patterns
export async function initializeAIServices(): Promise<void> {
  try {
    console.log('[AI Services] Initializing standardized service registry...');
    await serviceRegistry.initialize();
    console.log('[AI Services] All services initialized successfully using new patterns');
  } catch (error) {
    console.error('[AI Services] Failed to initialize service registry:', error);
    throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test all services connectivity using standardized patterns
export async function testAllServices(): Promise<{ [service: string]: boolean }> {
  try {
    console.log('[AI Services] Testing service connectivity using standardized patterns...');
    const results = await serviceRegistry.testAllServices();
    console.log('[AI Services] Service connectivity test completed:', results);
    return results;
  } catch (error) {
    console.error('[AI Services] Service test failed:', error);
    throw new Error(`Service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get service using standardized registry
export async function getAIService<T>(token: string): Promise<T> {
  return await serviceRegistry.getService<T>(token as any);
}

// Get service health status
export async function getServicesHealthStatus() {
  return await serviceRegistry.getHealthStatus();
}

// Shutdown all services
export async function shutdownAIServices(): Promise<void> {
  await serviceRegistry.shutdown();
}

/**
 * NEW WORKFLOW UTILITIES WITH STANDARDIZED SERVICE ACCESS
 */
export class AIWorkflowUtils {
  static async generateVideoScript(
    topic: string,
    videoType: 'story' | 'reddit' | 'quiz' | 'educational' | 'viral',
    duration: number,
    language: string = 'en'
  ) {
    const openai = await serviceRegistry.getService(SERVICE_TOKENS.OPENAI);
    return await openai.generateScript({
      videoType,
      topic,
      duration,
      language,
      tone: 'professional',
    });
  }

  static async generateVoiceOver(
    text: string,
    language: string = 'en',
    gender: 'male' | 'female' = 'female',
    style: 'professional' | 'casual' | 'energetic' = 'professional'
  ) {
    const elevenlabs = await serviceRegistry.getService(SERVICE_TOKENS.ELEVENLABS);
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
    const whisper = await serviceRegistry.getService(SERVICE_TOKENS.WHISPER);
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
    const dalle = await serviceRegistry.getService(SERVICE_TOKENS.DALLE);
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
    const s3 = await serviceRegistry.getService(SERVICE_TOKENS.S3);
    const fileName = filePath.split('/').pop() || 'unknown';
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
    const remotion = await serviceRegistry.getService(SERVICE_TOKENS.REMOTION);
    const s3 = await serviceRegistry.getService(SERVICE_TOKENS.S3);

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

// Export the service registry for direct access
export { serviceRegistry };

// Export the utility class
export default AIWorkflowUtils;
