/**
 * TypeScript interfaces for centralized configuration system
 * Defines all configuration types used across the ReelSpeed backend
 */

// Environment configuration
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CORS_ORIGIN: string;

  // Database
  MONGODB_URI: string;
  DB_NAME: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;

  // Authentication
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // AI Services
  OPENAI_API_KEY: string;
  OPENAI_ORGANIZATION?: string;
  ELEVENLABS_API_KEY: string;

  // Storage Provider (AWS or Cloudflare)
  STORAGE_PROVIDER: 'aws' | 'cloudflare' | 'local';

  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;

  // Cloudflare R2 Configuration
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;

  // Remotion Configuration
  REMOTION_COMPOSITIONS_PATH?: string;
  REMOTION_OUTPUT_DIR?: string;
  LAMBDA_ROLE?: string;

  // Feature Flags
  USE_MOCK_SERVICES: boolean;
  ENABLE_CACHING: boolean;
  ENABLE_RATE_LIMITING: boolean;

  // Security
  BCRYPT_ROUNDS: number;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';

  // File Upload Limits
  MAX_FILE_SIZE: number;
  MAX_UPLOAD_FILES: number;
}

// Server configuration
export interface ServerConfig {
  port: number;
  host: string;
  cors: string;
  environment: 'development' | 'production' | 'test';
  trustProxy: boolean;
}

// Database configuration
export interface DatabaseConfig {
  uri: string;
  name: string;
  options: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
  };
}

// Redis configuration
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number | null;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  connectTimeout: number;
  commandTimeout: number;
}

// Authentication configuration
export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
}

// AI Services configuration
export interface AIServicesConfig {
  openai: OpenAIConfig;
  elevenlabs: ElevenLabsConfig;
}

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  orgId?: string; // Legacy compatibility
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ElevenLabsConfig {
  apiKey: string;
  model: string;
  voice: string;
  stability: number;
  similarityBoost: number;
  name?: string; // Add optional name for compatibility
}

// Storage configuration
export interface StorageConfig {
  provider: 'aws' | 'cloudflare' | 'local';
  aws?: AWSStorageConfig;
  cloudflare?: CloudflareStorageConfig;
  local?: LocalStorageConfig;
}

export interface AWSStorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export interface CloudflareStorageConfig {
  accountId: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  endpoint: string;
}

export interface LocalStorageConfig {
  uploadPath: string;
  maxSize: number;
}

// Remotion configuration
export interface RemotionConfig {
  compositionsPath: string;
  outputDir: string;
  lambdaRegion: string;
  lambdaRole?: string;
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
  crf: number;
  pixelFormat: string;
}

// Cache configuration
export interface CacheConfig {
  redis: RedisConfig;
  defaultTTL: number;
  memoryFallback: boolean;
  keyPrefix: string;
}

// Feature flags
export interface FeatureFlags {
  useMockServices: boolean;
  enableCaching: boolean;
  enableRateLimiting: boolean;
  enableMetrics: boolean;
  enableAudioGeneration: boolean;
  enableVideoGeneration: boolean;
}

// Security configuration
export interface SecurityConfig {
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  fileUpload: {
    maxFileSize: number;
    maxFiles: number;
    allowedExtensions: string[];
    allowedMimeTypes: string[];
  };
  cors: {
    origins: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
}

// Logging configuration
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'combined' | 'dev';
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFiles: number;
  maxSize: string;
}

// Main application configuration interface
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  ai: AIServicesConfig;
  storage: StorageConfig;
  remotion: RemotionConfig;
  cache: CacheConfig;
  features: FeatureFlags;
  security: SecurityConfig;
  logging: LoggingConfig;
}

// Configuration validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
}

// Configuration loading options
export interface ConfigLoadOptions {
  validateRequired?: boolean;
  validateTypes?: boolean;
  allowUnknownKeys?: boolean;
  logValidation?: boolean;
}
