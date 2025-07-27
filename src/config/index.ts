/**
 * Centralized Configuration System for ReelSpeed Backend
 *
 * This is the main configuration module that replaces all direct process.env usage
 * and provides type-safe, validated configuration throughout the application.
 *
 * Usage:
 * 1. Call initializeConfig() at application startup
 * 2. Use getConfig() to access configuration anywhere in the app
 * 3. Use specific getters like getServerConfig(), getDatabaseConfig(), etc.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  AppConfig,
  EnvironmentConfig,
  ServerConfig,
  DatabaseConfig,
  RedisConfig,
  AuthConfig,
  AIServicesConfig,
  StorageConfig,
  RemotionConfig,
  CacheConfig,
  FeatureFlags,
  SecurityConfig,
  LoggingConfig,
  ConfigLoadOptions
} from './types';
import {
  validateEnvironmentConfig,
  validateAppConfig,
  validateProductionConfig,
  logValidationResults,
  checkRequiredEnvVars
} from './validation';

// Global configuration instance
let appConfig: AppConfig | null = null;
let envConfig: EnvironmentConfig | null = null;

/**
 * Initialize the configuration system
 * This should be called once at application startup
 */
export function initializeConfig(options: ConfigLoadOptions = {}): { env: EnvironmentConfig; config: AppConfig } {
  const {
    validateRequired = true,
    validateTypes = true,
    logValidation = true
  } = options;


  if (appConfig && envConfig) {
    return { env: envConfig, config: appConfig };
  }

  // Load environment variables
  loadEnvironmentVariables();

  // Load and validate environment configuration
  envConfig = loadEnvironmentConfig();

  if (validateRequired) {
    const envValidation = validateEnvironmentConfig(envConfig);
    if (logValidation) {
      logValidationResults(envValidation, 'Environment configuration');
    }

    if (!envValidation.isValid) {
      throw new Error('Environment configuration validation failed. Check required environment variables.');
    }

    // Additional production validation
    if (envConfig.NODE_ENV === 'production') {
      const prodValidation = validateProductionConfig(envConfig);
      if (logValidation) {
        logValidationResults(prodValidation, 'Production configuration');
      }

      if (!prodValidation.isValid) {
        throw new Error('Production configuration validation failed. Check security requirements.');
      }
    }
  }

  // Build application configuration
  appConfig = buildAppConfig(envConfig);

  if (validateTypes) {
    const appValidation = validateAppConfig(appConfig);
    if (logValidation) {
      logValidationResults(appValidation, 'Application configuration');
    }

    if (!appValidation.isValid) {
      throw new Error('Application configuration validation failed.');
    }
  }

  // Log configuration summary
  if (logValidation) {
    logConfigurationSummary(envConfig, appConfig);
  }

  return { env: envConfig, config: appConfig };
}

/**
 * Load environment variables from .env files
 */
function loadEnvironmentVariables(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Go up one directory to the monorepo root
  const monorepoRoot = path.resolve(process.cwd(), '..');

  // Load environment-specific .env files from the root
  // The first file found with a variable will win.
  const envFiles = [
    path.join(monorepoRoot, '.env.local'), // For local overrides
    path.join(monorepoRoot, `.env.${nodeEnv}`),
    path.join(monorepoRoot, '.env') // General .env file
  ];

  envFiles.forEach(file => {
    dotenv.config({ path: file });
  });
}

/**
 * Load environment configuration from process.env
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  const parseBoolean = (value: string | undefined, defaultValue = false): boolean => {
    if (!value) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  };

  const parseNumber = (value: string | undefined, defaultValue: number): number => {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  return {
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    PORT: parseNumber(process.env.BACKEND_PORT || process.env.PORT, 3000),
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    DB_NAME: process.env.MONGODB_DB_NAME || process.env.DB_NAME || 'reelspeed',

    // Redis
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseNumber(process.env.REDIS_PORT, 6379),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: parseNumber(process.env.REDIS_DB, 0),

    // Authentication
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // AI Services
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_ORGANIZATION: process.env.OPENAI_ORGANIZATION,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',

    // Storage
    STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER as 'aws' | 'cloudflare' | 'local') || 'local',

    // AWS
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,

    // Cloudflare R2
    R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET_NAME,
    R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
    R2_PUBLIC_URL: process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL,

    // Remotion
    REMOTION_COMPOSITIONS_PATH: process.env.REMOTION_COMPOSITIONS_PATH || '../reelspeed-video-service/src/compositions',
    REMOTION_OUTPUT_DIR: process.env.REMOTION_OUTPUT_DIR || './temp/videos',
    LAMBDA_ROLE: process.env.LAMBDA_ROLE,

    // Feature Flags
    USE_MOCK_SERVICES: parseBoolean(process.env.USE_MOCK_SERVICES, false),
    ENABLE_CACHING: parseBoolean(process.env.ENABLE_CACHING, true),
    ENABLE_RATE_LIMITING: parseBoolean(process.env.ENABLE_RATE_LIMITING, true),

    // Security
    BCRYPT_ROUNDS: parseNumber(process.env.BCRYPT_ROUNDS, 12),

    // Logging
    LOG_LEVEL: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',

    // File Upload
    MAX_FILE_SIZE: parseNumber(process.env.MAX_FILE_SIZE, 50 * 1024 * 1024), // 50MB
    MAX_UPLOAD_FILES: parseNumber(process.env.MAX_UPLOAD_FILES, 10),

  };
}

/**
 * Build application configuration from environment config
 */
function buildAppConfig(env: EnvironmentConfig): AppConfig {
  return {
    server: buildServerConfig(env),
    database: buildDatabaseConfig(env),
    redis: buildRedisConfig(env),
    auth: buildAuthConfig(env),
    ai: buildAIServicesConfig(env),
    storage: buildStorageConfig(env),
    remotion: buildRemotionConfig(env),
    cache: buildCacheConfig(env),
    features: buildFeatureFlags(env),
    security: buildSecurityConfig(env),
    logging: buildLoggingConfig(env)
  };
}

function buildServerConfig(env: EnvironmentConfig): ServerConfig {
  return {
    port: env.PORT,
    host: env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost',
    cors: env.CORS_ORIGIN,
    environment: env.NODE_ENV,
    trustProxy: env.NODE_ENV === 'production'
  };
}

function buildDatabaseConfig(env: EnvironmentConfig): DatabaseConfig {
  return {
    uri: env.MONGODB_URI,
    name: env.DB_NAME,
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000
    }
  };
}

function buildRedisConfig(env: EnvironmentConfig): RedisConfig {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000
  };
}

function buildAuthConfig(env: EnvironmentConfig): AuthConfig {
  return {
    jwtSecret: env.JWT_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    bcryptRounds: env.BCRYPT_ROUNDS
  };
}

function buildAIServicesConfig(env: EnvironmentConfig): AIServicesConfig {
  return {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      organization: env.OPENAI_ORGANIZATION,
      orgId: env.OPENAI_ORGANIZATION, // Legacy compatibility
      model: 'gpt-3.5-turbo',
      maxTokens: 4000,
      temperature: 0.7
    },
    elevenlabs: {
      apiKey: env.ELEVENLABS_API_KEY,
      model: 'eleven_monolingual_v1',
      voice: 'Rachel',
      stability: 0.5,
      similarityBoost: 0.8
    }
  };
}

function buildStorageConfig(env: EnvironmentConfig): StorageConfig {
  const config: StorageConfig = {
    provider: env.STORAGE_PROVIDER
  };

  if (env.STORAGE_PROVIDER === 'aws' && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    config.aws = {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION!,
      bucket: env.AWS_S3_BUCKET!
    };
  }

  if (env.STORAGE_PROVIDER === 'cloudflare' && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    config.cloudflare = {
      accountId: env.R2_ACCOUNT_ID!,
      accessKey: env.R2_ACCESS_KEY_ID,
      secretKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET_NAME!,
      endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      publicUrl: env.R2_PUBLIC_URL
    };
  }

  if (env.STORAGE_PROVIDER === 'local') {
    config.local = {
      uploadPath: path.resolve(process.cwd(), 'uploads'),
      maxSize: env.MAX_FILE_SIZE
    };
  }

  return config;
}

function buildRemotionConfig(env: EnvironmentConfig): RemotionConfig {
  return {
    compositionsPath: path.resolve(process.cwd(), env.REMOTION_COMPOSITIONS_PATH!),
    outputDir: path.resolve(process.cwd(), env.REMOTION_OUTPUT_DIR!),
    lambdaRegion: env.AWS_REGION || 'us-east-1',
    lambdaRole: env.LAMBDA_ROLE,
    codec: 'h264',
    crf: 18,
    pixelFormat: 'yuv420p'
  };
}

function buildCacheConfig(env: EnvironmentConfig): CacheConfig {
  return {
    redis: buildRedisConfig(env),
    defaultTTL: 30 * 60, // 30 minutes
    memoryFallback: true,
    keyPrefix: 'reelspeed:'
  };
}

function buildFeatureFlags(env: EnvironmentConfig): FeatureFlags {
  return {
    useMockServices: env.USE_MOCK_SERVICES,
    enableCaching: env.ENABLE_CACHING,
    enableRateLimiting: env.ENABLE_RATE_LIMITING,
    enableMetrics: env.NODE_ENV === 'production',
    enableAudioGeneration: true,
    enableVideoGeneration: true
  };
}

function buildSecurityConfig(env: EnvironmentConfig): SecurityConfig {
  return {
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: env.NODE_ENV === 'production' ? 100 : 1000,
      skipSuccessfulRequests: false
    },
    fileUpload: {
      maxFileSize: env.MAX_FILE_SIZE,
      maxFiles: env.MAX_UPLOAD_FILES,
      allowedExtensions: ['.mp3', '.wav', '.m4a', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov'],
      allowedMimeTypes: ['audio/*', 'image/*', 'video/mp4', 'video/quicktime']
    },
    cors: {
      origins: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  };
}

function buildLoggingConfig(env: EnvironmentConfig): LoggingConfig {
  return {
    level: env.LOG_LEVEL,
    format: env.NODE_ENV === 'production' ? 'json' : 'dev',
    enableConsole: true,
    enableFile: env.NODE_ENV === 'production',
    filePath: env.NODE_ENV === 'production' ? 'logs/app.log' : undefined,
    maxFiles: 10,
    maxSize: '10MB'
  };
}

/**
 * Log configuration summary
 */
function logConfigurationSummary(env: EnvironmentConfig, config: AppConfig): void {
  console.log('🔧 [Config] Configuration initialized successfully:');
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Database: ${config.database.name}`);
  console.log(`   Storage: ${config.storage.provider}`);
  console.log(`   Mock Services: ${config.features.useMockServices ? 'enabled' : 'disabled'}`);
  console.log(`   Caching: ${config.features.enableCaching ? 'enabled' : 'disabled'}`);

  // Check for missing environment variables
  const { missing, present } = checkRequiredEnvVars();
  if (missing.length > 0) {
    console.warn(`⚠️ [Config] Missing environment variables: ${missing.join(', ')}`);
  }
  console.log(`✅ [Config] Required environment variables: ${present.length}/${present.length + missing.length} present`);
}

/**
 * Get the complete application configuration
 */
export function getConfig(): AppConfig {
  if (!appConfig) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return appConfig;
}

/**
 * Get environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!envConfig) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return envConfig;
}

/**
 * Get server configuration
 */
export function getServerConfig(): ServerConfig {
  return getConfig().server;
}

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  return getConfig().database;
}

/**
 * Get Redis configuration
 */
export function getRedisConfig(): RedisConfig {
  return getConfig().redis;
}

/**
 * Get authentication configuration
 */
export function getAuthConfig(): AuthConfig {
  return getConfig().auth;
}

/**
 * Get AI services configuration
 */
export function getAIConfig(): AIServicesConfig {
  return getConfig().ai;
}

/**
 * Get storage configuration
 */
export function getStorageConfig(): StorageConfig {
  return getConfig().storage;
}

/**
 * Get Remotion configuration
 */
export function getRemotionConfig(): RemotionConfig {
  return getConfig().remotion;
}

/**
 * Get cache configuration
 */
export function getCacheConfig(): CacheConfig {
  return getConfig().cache;
}

/**
 * Get feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return getConfig().features;
}

/**
 * Get security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  return getConfig().security;
}

/**
 * Get logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  return getConfig().logging;
}

/**
 * Utility functions
 */
export function isDevelopment(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'production';
}

export function isTest(): boolean {
  return getEnvironmentConfig().NODE_ENV === 'test';
}

export function useMockServices(): boolean {
  return getFeatureFlags().useMockServices;
}

export function isCachingEnabled(): boolean {
  return getFeatureFlags().enableCaching;
}

export function isRateLimitingEnabled(): boolean {
  return getFeatureFlags().enableRateLimiting;
}

// Legacy compatibility exports
export {
  getServerConfig as getBackendConfig,
  getServerConfig as getPort,
  getServerConfig as getCorsOrigin
};
