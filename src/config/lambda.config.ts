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
 * Default Lambda configuration optimized for video rendering
 */
const DEFAULT_CONFIG: LambdaConfig = {
  functionName: 'reelspeed-lambda-renderer',
  region: 'us-east-1',
  bucketName: 'remotionlambda-useast1-reelspeed',
  
  // Optimized for video rendering performance
  memory: 3008, // Maximum Lambda memory
  timeout: 600, // 10 minutes
  diskSize: 4096, // 4GB disk space
  
  // Rendering optimization
  concurrencyPerLambda: 4, // Utilize full CPU
  framesPerLambda: 30, // Good balance for progress updates
  codec: 'h264',
  crf: 18, // High quality
  
  // Reliability settings
  maxRetries: 3,
  maxConcurrency: 10,
  enableInsights: false // Reduce costs
};

/**
 * Environment-specific configuration overrides
 */
const CONFIG_OVERRIDES = {
  development: {
    functionName: 'reelspeed-lambda-renderer-dev',
    bucketName: 'remotionlambda-useast1-reelspeed-dev',
    timeout: 300, // 5 minutes for dev
    enableInsights: true // Enable for debugging
  },
  
  production: {
    functionName: 'reelspeed-lambda-renderer-prod',
    bucketName: 'remotionlambda-useast1-reelspeed-prod',
    timeout: 600, // 10 minutes for prod
    enableInsights: false // Reduce costs
  },
  
  test: {
    functionName: 'reelspeed-lambda-renderer-test',
    bucketName: 'remotionlambda-useast1-reelspeed-test',
    timeout: 120, // 2 minutes for tests
    maxConcurrency: 2
  }
};

/**
 * Load Lambda configuration based on environment
 */
export function getLambdaConfig(): LambdaConfig {
  const env = process.env.NODE_ENV || 'development';
  const overrides = CONFIG_OVERRIDES[env as keyof typeof CONFIG_OVERRIDES] || {};
  
  // Merge default config with environment overrides
  const config: LambdaConfig = {
    ...DEFAULT_CONFIG,
    ...overrides
  };
  
  // Apply environment variable overrides
  if (process.env.LAMBDA_FUNCTION_NAME) {
    config.functionName = process.env.LAMBDA_FUNCTION_NAME;
  }
  
  if (process.env.LAMBDA_BUCKET_NAME) {
    config.bucketName = process.env.LAMBDA_BUCKET_NAME;
  }
  
  if (process.env.LAMBDA_SITE_URL) {
    config.siteUrl = process.env.LAMBDA_SITE_URL;
  }
  
  if (process.env.LAMBDA_REGION) {
    config.region = process.env.LAMBDA_REGION as AwsRegion;
  }
  
  if (process.env.LAMBDA_MEMORY) {
    config.memory = parseInt(process.env.LAMBDA_MEMORY) as 1024 | 2048 | 3008;
  }
  
  if (process.env.LAMBDA_TIMEOUT) {
    config.timeout = parseInt(process.env.LAMBDA_TIMEOUT);
  }
  
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
 * Export singleton instance
 */
export const lambdaConfig = getLambdaConfig();

/**
 * Validate configuration on module load
 */
const validation = validateLambdaConfig(lambdaConfig);
if (!validation.valid) {
  console.warn('Lambda configuration issues:', validation.errors);
}