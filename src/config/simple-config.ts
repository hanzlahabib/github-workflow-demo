/**
 * Simple Configuration System for ReelSpeed Backend
 * Replaces the broken shared config dependency
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface BackendConfig {
  port: number;
  nodeEnv: string;
  cors: string;
  database: {
    uri: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  auth: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
  };
  ai: {
    openai: {
      apiKey: string;
      orgId?: string;
    };
    elevenlabs: {
      apiKey: string;
    };
  };
  storage: {
    provider: string;
    cloudflare: {
      accountId: string;
      accessKey: string;
      secretKey: string;
      endpoint: string;
      bucket: string;
      publicUrl: string;
    };
  };
  features: {
    useMockServices: boolean;
    enableCaching: boolean;
  };
  videoService: {
    url?: string;
    path?: string;
  };
}

/**
 * Create configuration from environment variables
 */
function createConfig(): BackendConfig {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    cors: process.env.CORS_ORIGIN || 'http://localhost:5173',
    
    database: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      name: process.env.DB_NAME || 'reelspeed'
    },
    
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD
    },
    
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
      jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    
    ai: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        orgId: process.env.OPENAI_ORG_ID
      },
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || ''
      }
    },
    
    storage: {
      provider: process.env.STORAGE_PROVIDER || 'cloudflare',
      cloudflare: {
        accountId: process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || '',
        accessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
        secretKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
        bucket: process.env.CLOUDFLARE_R2_BUCKET || '',
        publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || ''
      }
    },
    
    features: {
      useMockServices: process.env.USE_MOCK_SERVICES === 'true',
      enableCaching: process.env.ENABLE_CACHING !== 'false'
    },
    
    videoService: {
      url: process.env.VIDEO_SERVICE_URL,
      path: process.env.VIDEO_SERVICE_PATH
    }
  };
}

// Global configuration instance
let config: BackendConfig | null = null;

/**
 * Get the configuration (creates it if needed)
 */
export function getConfig(): BackendConfig {
  if (!config) {
    config = createConfig();
    console.log(`[Config] Loaded configuration for ${config.nodeEnv} environment`);
    console.log(`[Config] Backend port: ${config.port}`);
    console.log(`[Config] Storage provider: ${config.storage.provider}`);
    console.log(`[Config] Mock services: ${config.features.useMockServices ? 'enabled' : 'disabled'}`);
  }
  return config;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getConfig().nodeEnv === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getConfig().nodeEnv === 'production';
}

/**
 * Legacy compatibility functions
 */
export function getPort(): number {
  return getConfig().port;
}

export function getCorsOrigin(): string {
  return getConfig().cors;
}

export function getDatabaseConfig() {
  const config = getConfig();
  return {
    uri: config.database.uri,
    name: config.database.name
  };
}

export function getRedisConfig() {
  const config = getConfig();
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  };
}

export function getAuthConfig() {
  const config = getConfig();
  return {
    jwtSecret: config.auth.jwtSecret,
    jwtRefreshSecret: config.auth.jwtRefreshSecret,
    jwtExpiresIn: config.auth.jwtExpiresIn,
    jwtRefreshExpiresIn: config.auth.jwtRefreshExpiresIn
  };
}

export function getAIConfig() {
  const config = getConfig();
  return {
    openai: config.ai.openai,
    elevenlabs: config.ai.elevenlabs
  };
}

export function getStorageConfig() {
  const config = getConfig();
  return config.storage;
}

export function useMockServices(): boolean {
  return getConfig().features.useMockServices;
}