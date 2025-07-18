// AI Services Configuration Example
// Copy this file to config.ts and fill in your actual API keys and settings

import { AIServicesConfig } from './index';

export const aiServicesConfig: AIServicesConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
    organization: process.env.OPENAI_ORGANIZATION || undefined, // Optional
  },
  
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || 'your_elevenlabs_api_key_here',
  },
  
  whisper: {
    apiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here', // Same as OpenAI
  },
  
  dalle: {
    apiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here', // Same as OpenAI
  },
  
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your_aws_access_key_id',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your_aws_secret_access_key',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET_NAME || 'reelspeed-assets',
  },
  
  remotion: {
    compositionsPath: process.env.REMOTION_COMPOSITIONS_PATH || './remotion/compositions',
    outputDir: process.env.REMOTION_OUTPUT_DIR || './renders',
    lambdaRegion: process.env.REMOTION_LAMBDA_REGION || undefined, // Optional for cloud rendering
    lambdaRole: process.env.REMOTION_LAMBDA_ROLE || undefined, // Optional for cloud rendering
  },
};

// Environment variables template for .env file
export const ENV_TEMPLATE = `
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION=org-...

# ElevenLabs Configuration  
ELEVENLABS_API_KEY=...

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=reelspeed-assets

# Remotion Configuration
REMOTION_COMPOSITIONS_PATH=./remotion/compositions
REMOTION_OUTPUT_DIR=./renders
REMOTION_LAMBDA_REGION=us-east-1
REMOTION_LAMBDA_ROLE=arn:aws:iam::123456789012:role/lambda-role

# Application Configuration
NODE_ENV=development
PORT=3000
`;

// Development configuration with mock services (for testing without API keys)
export const developmentConfig: Partial<AIServicesConfig> = {
  // You can override specific services for development
  // For example, use local file storage instead of S3 during development
};

// Production configuration with additional security settings
export const productionConfig: Partial<AIServicesConfig> = {
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION!,
    bucketName: process.env.S3_BUCKET_NAME!,
  },
  remotion: {
    compositionsPath: '/app/remotion/compositions',
    outputDir: '/tmp/renders',
    lambdaRegion: process.env.REMOTION_LAMBDA_REGION,
    lambdaRole: process.env.REMOTION_LAMBDA_ROLE,
  },
};

// Service feature flags for conditional initialization
export const serviceFeatures = {
  enableOpenAI: process.env.ENABLE_OPENAI !== 'false',
  enableElevenLabs: process.env.ENABLE_ELEVENLABS !== 'false',
  enableWhisper: process.env.ENABLE_WHISPER !== 'false',
  enableDalle: process.env.ENABLE_DALLE !== 'false',
  enableS3: process.env.ENABLE_S3 !== 'false',
  enableRemotion: process.env.ENABLE_REMOTION !== 'false',
  enableLambdaRendering: process.env.ENABLE_LAMBDA_RENDERING === 'true',
};

// Rate limiting configuration
export const rateLimits = {
  openai: {
    requestsPerMinute: 60,
    tokensPerMinute: 40000,
  },
  elevenlabs: {
    requestsPerMinute: 30,
    charactersPerMonth: 10000,
  },
  whisper: {
    requestsPerMinute: 50,
    fileSizeLimitMB: 25,
  },
  dalle: {
    requestsPerMinute: 5,
    imagesPerDay: 50,
  },
  s3: {
    uploadsPerMinute: 100,
    bandwidthLimitMBps: 100,
  },
  remotion: {
    concurrentRenders: 4,
    maxRenderTimeMinutes: 30,
  },
};

// Quality presets for different use cases
export const qualityPresets = {
  draft: {
    video: { quality: 60, crf: 28 },
    audio: { bitrate: 128 },
    image: { quality: 70 },
  },
  standard: {
    video: { quality: 80, crf: 23 },
    audio: { bitrate: 192 },
    image: { quality: 85 },
  },
  high: {
    video: { quality: 90, crf: 18 },
    audio: { bitrate: 256 },
    image: { quality: 95 },
  },
  ultra: {
    video: { quality: 95, crf: 15 },
    audio: { bitrate: 320 },
    image: { quality: 100 },
  },
};

// Language-specific configurations
export const languageConfigs = {
  en: {
    elevenlabs: {
      defaultVoice: 'pNInz6obpgDQGcFmaJgB', // Adam
      voiceSettings: { stability: 0.5, similarity_boost: 0.8 },
    },
    whisper: { model: 'whisper-1' },
  },
  es: {
    elevenlabs: {
      defaultVoice: 'VR6AewLTigWG4xSOukaG', // Arnold
      voiceSettings: { stability: 0.6, similarity_boost: 0.9 },
    },
    whisper: { model: 'whisper-1' },
  },
  ur: {
    elevenlabs: {
      defaultVoice: 'custom_urdu_voice_1',
      voiceSettings: { stability: 0.7, similarity_boost: 0.9 },
    },
    whisper: { model: 'whisper-1' },
  },
  ar: {
    elevenlabs: {
      defaultVoice: 'custom_arabic_voice_1',
      voiceSettings: { stability: 0.7, similarity_boost: 0.9 },
    },
    whisper: { model: 'whisper-1' },
  },
  hi: {
    elevenlabs: {
      defaultVoice: 'custom_hindi_voice_1',
      voiceSettings: { stability: 0.7, similarity_boost: 0.9 },
    },
    whisper: { model: 'whisper-1' },
  },
};

// Template configurations for different video types
export const templateConfigs = {
  'story-minimal': {
    defaultDuration: 60,
    aspectRatio: '9:16' as const,
    fps: 30,
    quality: qualityPresets.standard,
  },
  'reddit-dark': {
    defaultDuration: 90,
    aspectRatio: '9:16' as const,
    fps: 30,
    quality: qualityPresets.standard,
  },
  'quiz-modern': {
    defaultDuration: 120,
    aspectRatio: '9:16' as const,
    fps: 30,
    quality: qualityPresets.high,
  },
  'educational-professional': {
    defaultDuration: 180,
    aspectRatio: '16:9' as const,
    fps: 30,
    quality: qualityPresets.high,
  },
};

// Monitoring and logging configuration
export const monitoringConfig = {
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  enableTracing: process.env.ENABLE_TRACING === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
  tracingEndpoint: process.env.TRACING_ENDPOINT,
};

// Cache configuration
export const cacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  ttl: {
    voiceList: 3600, // 1 hour
    compositions: 1800, // 30 minutes
    apiResponses: 300, // 5 minutes
  },
};

// Validation functions
export function validateConfig(config: AIServicesConfig): string[] {
  const errors: string[] = [];

  if (!config.openai.apiKey) {
    errors.push('OpenAI API key is required');
  }

  if (!config.elevenlabs.apiKey) {
    errors.push('ElevenLabs API key is required');
  }

  if (!config.s3.accessKeyId || !config.s3.secretAccessKey) {
    errors.push('AWS credentials are required');
  }

  if (!config.s3.bucketName) {
    errors.push('S3 bucket name is required');
  }

  if (!config.remotion.compositionsPath) {
    errors.push('Remotion compositions path is required');
  }

  if (!config.remotion.outputDir) {
    errors.push('Remotion output directory is required');
  }

  return errors;
}

// Helper function to get configuration based on environment
export function getConfigForEnvironment(): AIServicesConfig {
  const baseConfig = aiServicesConfig;
  
  if (process.env.NODE_ENV === 'production') {
    return { ...baseConfig, ...productionConfig };
  }
  
  if (process.env.NODE_ENV === 'development') {
    return { ...baseConfig, ...developmentConfig };
  }
  
  return baseConfig;
}