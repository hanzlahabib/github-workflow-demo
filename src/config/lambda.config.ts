/**
 * Unified Lambda Configuration for ReelSpeed
 * 
 * Simplified configuration system matching Clippie's approach
 * Single source of truth for all Lambda-related settings
 */

import { AwsRegion } from '@remotion/lambda';

export interface LambdaConfig {
  // Core Lambda Settings
  functionName: string;
  region: AwsRegion;
  bucketName: string;
  siteUrl?: string;
  
  // Performance Settings
  memory: 1024 | 2048 | 3008;
  timeout: number; // seconds
  diskSize: number; // MB
  
  // Rendering Settings
  concurrencyPerLambda: number;
  framesPerLambda: number;
  codec: 'h264' | 'h265';
  crf: number; // quality
  
  // Operational Settings
  maxRetries: number;
  maxConcurrency: number;
  enableInsights: boolean;
}

/**
 * Default Lambda configuration - using actual deployed function
 */
const DEFAULT_CONFIG: LambdaConfig = {
  functionName: 'remotion-render-4-0-331-mem3008mb-disk10240mb-900sec',
  region: 'us-east-1',
  bucketName: 'remotionlambda-useast1-oelksfi1c7',
  siteUrl: 'https://remotionlambda-useast1-oelksfi1c7.s3.us-east-1.amazonaws.com/sites/qsqxdgnwtz/index.html',
  
  // MAXIMUM PERFORMANCE SPECS
  memory: 3008, // Maximum Lambda memory
  timeout: 840, // 14 minutes (safe margin for 15-min limit)
  diskSize: 10240, // 10GB disk space maximum
  
  // OPTIMIZED RENDERING SETTINGS - Tuned for 88% encoding issue
  concurrencyPerLambda: 1, // Single thread to avoid memory pressure during encoding
  framesPerLambda: 15, // Smaller chunks to prevent memory buildup during final encoding
  codec: 'h264',
  crf: 18, // High quality
  
  // RELIABILITY & COST OPTIMIZATION
  maxRetries: 3,
  maxConcurrency: 20, // Maximum throughput
  enableInsights: false // Reduce costs
};

/**
 * Environment-specific configuration overrides
 */
const CONFIG_OVERRIDES = {
  // No overrides needed - defaults are correct for development
  production: {
    functionName: 'reelspeed-lambda-renderer-prod',
    bucketName: 'remotionlambda-useast1-reelspeed-prod'
  },
  
  test: {
    functionName: 'reelspeed-lambda-renderer-test',
    bucketName: 'remotionlambda-useast1-reelspeed-test',
    timeout: 300, // 5 minutes for tests
    maxConcurrency: 5,
    memory: 2048 // Reduce memory for tests to save costs
  }
};

/**
 * Simple Lambda configuration loading
 */
export function getLambdaConfig(): LambdaConfig {
  const env = process.env.NODE_ENV || 'development';
  const overrides = CONFIG_OVERRIDES[env as keyof typeof CONFIG_OVERRIDES] || {};
  
  // Just merge defaults with environment overrides - simple and clean
  const config: LambdaConfig = {
    ...DEFAULT_CONFIG,
    ...overrides
  };
  
  return config;
}

/**
 * Validate Lambda configuration
 */
export function validateLambdaConfig(config: LambdaConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.functionName) {
    errors.push('Function name is required');
  }
  
  if (!config.bucketName) {
    errors.push('Bucket name is required');
  }
  
  if (config.memory < 1024 || config.memory > 3008) {
    errors.push('Memory must be between 1024 and 3008 MB');
  }
  
  if (config.timeout < 60 || config.timeout > 900) {
    errors.push('Timeout must be between 60 and 900 seconds');
  }
  
  if (config.maxRetries < 1 || config.maxRetries > 5) {
    errors.push('Max retries must be between 1 and 5');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate environment variables for deployment
 */
export function generateEnvVars(config: LambdaConfig): Record<string, string> {
  return {
    LAMBDA_FUNCTION_NAME: config.functionName,
    LAMBDA_BUCKET_NAME: config.bucketName,
    LAMBDA_REGION: config.region,
    LAMBDA_SITE_URL: config.siteUrl || '',
    LAMBDA_MEMORY: config.memory.toString(),
    LAMBDA_TIMEOUT: config.timeout.toString(),
    LAMBDA_MAX_RETRIES: config.maxRetries.toString(),
    LAMBDA_MAX_CONCURRENCY: config.maxConcurrency.toString()
  };
}

/**
 * Export dynamic config getter - no caching
 */
export const lambdaConfig = getLambdaConfig();

/**
 * Validate configuration on module load
 */
const validation = validateLambdaConfig(lambdaConfig);
if (!validation.valid) {
  console.warn('Lambda configuration issues:', validation.errors);
}