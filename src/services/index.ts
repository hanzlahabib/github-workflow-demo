/**
 * Clean AI Services Module
 * Simplified access to AI and cloud services
 */

// Export base classes and interfaces
export { BaseService, BaseServiceInterface, type ServiceConfig, type OperationResult } from './BaseService';

// Export configuration types
export type { AIServicesConfig } from '../config/types';

// Export service classes
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

// Export cache utilities
export { getCacheService, CacheKeys, CacheTTL } from './cache';