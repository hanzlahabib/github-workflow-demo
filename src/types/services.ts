// Service related types

// Cache service types
export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultTTL: number; // seconds
  memoryFallback: boolean;
}

export interface CacheStats {
  memoryCache: {
    size: number;
    keys: string[];
  };
  redis: {
    connected: boolean;
    info?: string;
    error?: string;
  };
}

// Base service configuration
export interface BaseServiceConfig {
  name: string;
  version?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
  enableCaching?: boolean;
}

// ElevenLabs Service Types
export interface ElevenLabsConfig {
  name?: string;
  apiKey: string;
  baseUrl?: string;
  version?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
  enableCaching?: boolean;
}

export interface Voice {
  voice_id: string;
  name: string;
  samples?: Array<{
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    hash: string;
  }>;
  category?: string;
  labels: Record<string, string>;
  description?: string;
  preview_url?: string;
  available_for_tiers: string[];
  settings?: any;
  high_quality_base_model_ids: string[];
  safety_control?: string;
}

export interface TextToSpeechRequest {
  text: string;
  voice_id: string;
  voice_settings?: any;
  language_code?: string;
  model_id?: string;
  output_format?: string;
}

export interface AudioGenerationResponse {
  audio_data: Buffer;
  content_type: string;
  filename: string;
  duration_ms?: number;
}

export interface VoicesListResponse {
  voices: Voice[];
  has_more: boolean;
  last_sort_id?: string;
}

export interface SupportedLanguage {
  language_id: string;
  name: string;
  native_name: string;
  accent_support: boolean;
}

// S3 Service Types
export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  signatureVersion?: string;
  publicUrl?: string;
}

export interface S3UploadOptions {
  key?: string;
  contentType?: string;
  acl?: 'private' | 'public-read' | 'public-read-write';
  metadata?: Record<string, string>;
}

export interface S3UploadResponse {
  url: string;
  key: string;
  etag?: string;
  size?: number;
}


// Video Service Types
export interface VideoServiceConfig {
  remotionUrl?: string;
  tempDir?: string;
  outputDir?: string;
}

export interface VideoGenerationProgress {
  progress: number;
  message: string;
  stage?: string;
}

export interface VideoGenerationResult {
  success: boolean;
  outputPath?: string;
  sizeInBytes?: number;
  durationInSeconds?: number;
  error?: string;
}

// OpenAI Service Types
export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  baseUrl?: string;
  name?: string; // Optional for backward compatibility
}

// DALL-E Service Types
export interface DALLEGenerationRequest {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface DALLEGenerationResponse {
  urls: string[];
  revised_prompt?: string;
}
