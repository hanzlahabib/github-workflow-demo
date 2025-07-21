/**
 * Centralized configuration for ReelSpeed Backend
 *
 * This replaces the old scattered configuration files with a single,
 * type-safe configuration system that uses the shared config package.
 */

import { loadEnvironment, createServiceConfig, EnvironmentConfig, ServiceConfig } from '@reelspeed/config';
import path from 'path';

// Global configuration instances
let environment: EnvironmentConfig | null = null;
let serviceConfig: ServiceConfig | null = null;

/**
 * Initialize the configuration system
 * This should be called once at application startup
 */
export function initializeConfig(): { env: EnvironmentConfig; config: ServiceConfig } {
  if (environment && serviceConfig) {
    return { env: environment, config: serviceConfig };
  }

  // Set the working directory to the project root to find .env files
  const projectRoot = path.resolve(__dirname, '../../../');
  process.chdir(projectRoot);

  // Load and validate environment
  environment = loadEnvironment();
  serviceConfig = createServiceConfig(environment);

  console.log(`[Config] Environment initialized: ${environment.NODE_ENV}`);
  console.log(`[Config] Backend port: ${serviceConfig.backend.port}`);
  console.log(`[Config] Storage provider: ${environment.STORAGE_PROVIDER}`);
  console.log(`[Config] Mock services: ${environment.USE_MOCK_SERVICES ? 'enabled' : 'disabled'}`);

  return { env: environment, config: serviceConfig };
}

/**
 * Get the current environment configuration
 * Throws an error if configuration hasn't been initialized
 */
export function getEnvironment(): EnvironmentConfig {
  if (!environment) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return environment;
}

/**
 * Get the current service configuration
 * Throws an error if configuration hasn't been initialized
 */
export function getServiceConfig(): ServiceConfig {
  if (!serviceConfig) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return serviceConfig;
}

/**
 * Get backend-specific configuration
 */
export function getBackendConfig() {
  return getServiceConfig().backend;
}

/**
 * Check if we're running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment().NODE_ENV === 'development';
}

/**
 * Check if we're running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment().NODE_ENV === 'production';
}

/**
 * Check if mock services should be used
 */
export function useMockServices(): boolean {
  return getEnvironment().USE_MOCK_SERVICES;
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  const config = getBackendConfig();
  return {
    uri: config.database.uri,
    name: config.database.name
  };
}

/**
 * Get Redis configuration
 */
export function getRedisConfig() {
  const config = getBackendConfig();
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  };
}

/**
 * Get authentication configuration
 */
export function getAuthConfig() {
  const config = getBackendConfig();
  return {
    jwtSecret: config.auth.jwtSecret,
    jwtRefreshSecret: config.auth.jwtRefreshSecret,
    jwtExpiresIn: config.auth.jwtExpiresIn,
    jwtRefreshExpiresIn: config.auth.jwtRefreshExpiresIn
  };
}

/**
 * Get AI services configuration
 */
export function getAIConfig() {
  const config = getBackendConfig();
  return {
    openai: config.ai.openai,
    elevenlabs: config.ai.elevenlabs
  };
}

/**
 * Get storage configuration
 */
export function getStorageConfig() {
  const config = getBackendConfig();
  return config.storage;
}

/**
 * Legacy compatibility: get port (deprecated, use getBackendConfig().port)
 * @deprecated Use getBackendConfig().port instead
 */
export function getPort(): number {
  return getBackendConfig().port;
}

/**
 * Legacy compatibility: get CORS origin (deprecated, use getBackendConfig().cors)
 * @deprecated Use getBackendConfig().cors instead
 */
export function getCorsOrigin(): string {
  return getBackendConfig().cors;
}
