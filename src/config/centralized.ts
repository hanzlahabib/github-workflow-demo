/**
 * Centralized configuration for ReelSpeed Backend
 *
 * Uses simple configuration system for reliable operation
 */

import { 
  getConfig, 
  BackendConfig, 
  isDevelopment as simpleIsDevelopment,
  isProduction as simpleIsProduction,
  getPort as simpleGetPort,
  getCorsOrigin as simpleGetCorsOrigin,
  getDatabaseConfig as simpleGetDatabaseConfig,
  getRedisConfig as simpleGetRedisConfig,
  getAuthConfig as simpleGetAuthConfig,
  getAIConfig as simpleGetAIConfig,
  getStorageConfig as simpleGetStorageConfig,
  useMockServices as simpleUseMockServices
} from './simple-config';

/**
 * Initialize the configuration system
 * This should be called once at application startup
 */
export function initializeConfig(): { config: BackendConfig } {
  const config = getConfig();
  return { config };
}

/**
 * Get backend-specific configuration
 */
export function getBackendConfig(): BackendConfig {
  return getConfig();
}

/**
 * Check if we're running in development mode
 */
export function isDevelopment(): boolean {
  return simpleIsDevelopment();
}

/**
 * Check if we're running in production mode
 */
export function isProduction(): boolean {
  return simpleIsProduction();
}

/**
 * Check if mock services should be used
 */
export function useMockServices(): boolean {
  return simpleUseMockServices();
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  return simpleGetDatabaseConfig();
}

/**
 * Get Redis configuration
 */
export function getRedisConfig() {
  return simpleGetRedisConfig();
}

/**
 * Get authentication configuration
 */
export function getAuthConfig() {
  return simpleGetAuthConfig();
}

/**
 * Get AI services configuration
 */
export function getAIConfig() {
  return simpleGetAIConfig();
}

/**
 * Get storage configuration
 */
export function getStorageConfig() {
  return simpleGetStorageConfig();
}

/**
 * Legacy compatibility: get port (deprecated, use getBackendConfig().port)
 * @deprecated Use getBackendConfig().port instead
 */
export function getPort(): number {
  return simpleGetPort();
}

/**
 * Legacy compatibility: get CORS origin (deprecated, use getBackendConfig().cors)
 * @deprecated Use getBackendConfig().cors instead
 */
export function getCorsOrigin(): string {
  return simpleGetCorsOrigin();
}
