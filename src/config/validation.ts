/**
 * Configuration validation system
 * Validates all required configuration values and provides helpful error messages
 */

import { EnvironmentConfig, AppConfig, ValidationResult, ValidationError, ValidationWarning } from './types';

/**
 * Validates the environment configuration
 */
export function validateEnvironmentConfig(config: Partial<EnvironmentConfig>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields validation
  const requiredFields: Array<keyof EnvironmentConfig> = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'REDIS_HOST',
    'REDIS_PORT',
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY'
  ];

  // Check required fields
  for (const field of requiredFields) {
    if (!config[field]) {
      errors.push({
        field,
        message: `Required environment variable ${field} is missing`,
        value: config[field]
      });
    }
  }

  // NODE_ENV validation
  if (config.NODE_ENV && !['development', 'production', 'test'].includes(config.NODE_ENV)) {
    errors.push({
      field: 'NODE_ENV',
      message: 'NODE_ENV must be one of: development, production, test',
      value: config.NODE_ENV
    });
  }

  // PORT validation
  if (config.PORT) {
    const port = Number(config.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({
        field: 'PORT',
        message: 'PORT must be a valid port number (1-65535)',
        value: config.PORT
      });
    }
  }

  // REDIS_PORT validation
  if (config.REDIS_PORT) {
    const port = Number(config.REDIS_PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({
        field: 'REDIS_PORT',
        message: 'REDIS_PORT must be a valid port number (1-65535)',
        value: config.REDIS_PORT
      });
    }
  }

  // MONGODB_URI validation
  if (config.MONGODB_URI && !config.MONGODB_URI.startsWith('mongodb://') && !config.MONGODB_URI.startsWith('mongodb+srv://')) {
    errors.push({
      field: 'MONGODB_URI',
      message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
      value: config.MONGODB_URI
    });
  }

  // JWT secrets validation
  if (config.JWT_SECRET && config.JWT_SECRET.length < 32) {
    warnings.push({
      field: 'JWT_SECRET',
      message: 'JWT_SECRET should be at least 32 characters for security',
      value: config.JWT_SECRET.length + ' characters'
    });
  }

  if (config.JWT_REFRESH_SECRET && config.JWT_REFRESH_SECRET.length < 32) {
    warnings.push({
      field: 'JWT_REFRESH_SECRET',
      message: 'JWT_REFRESH_SECRET should be at least 32 characters for security',
      value: config.JWT_REFRESH_SECRET.length + ' characters'
    });
  }

  // Storage provider validation
  if (config.STORAGE_PROVIDER) {
    if (!['aws', 'cloudflare', 'local'].includes(config.STORAGE_PROVIDER)) {
      errors.push({
        field: 'STORAGE_PROVIDER',
        message: 'STORAGE_PROVIDER must be one of: aws, cloudflare, local',
        value: config.STORAGE_PROVIDER
      });
    }

    // Validate storage-specific configuration
    if (config.STORAGE_PROVIDER === 'aws') {
      const requiredAWSFields = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'];
      for (const field of requiredAWSFields) {
        if (!config[field as keyof EnvironmentConfig]) {
          errors.push({
            field,
            message: `${field} is required when STORAGE_PROVIDER is 'aws'`,
            value: config[field as keyof EnvironmentConfig]
          });
        }
      }
    }

    if (config.STORAGE_PROVIDER === 'cloudflare') {
      const requiredR2Fields = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
      for (const field of requiredR2Fields) {
        if (!config[field as keyof EnvironmentConfig]) {
          errors.push({
            field,
            message: `${field} is required when STORAGE_PROVIDER is 'cloudflare'`,
            value: config[field as keyof EnvironmentConfig]
          });
        }
      }
    }
  }

  // API key validation
  if (config.OPENAI_API_KEY && !config.OPENAI_API_KEY.startsWith('sk-')) {
    warnings.push({
      field: 'OPENAI_API_KEY',
      message: 'OPENAI_API_KEY should start with "sk-"',
      value: 'Invalid format'
    });
  }

  // BCRYPT_ROUNDS validation
  if (config.BCRYPT_ROUNDS) {
    const rounds = Number(config.BCRYPT_ROUNDS);
    if (isNaN(rounds) || rounds < 8 || rounds > 15) {
      warnings.push({
        field: 'BCRYPT_ROUNDS',
        message: 'BCRYPT_ROUNDS should be between 8 and 15 for optimal security/performance balance',
        value: config.BCRYPT_ROUNDS
      });
    }
  }

  // File size validation
  if (config.MAX_FILE_SIZE) {
    const maxSize = Number(config.MAX_FILE_SIZE);
    if (isNaN(maxSize) || maxSize <= 0) {
      errors.push({
        field: 'MAX_FILE_SIZE',
        message: 'MAX_FILE_SIZE must be a positive number',
        value: config.MAX_FILE_SIZE
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates the complete application configuration
 */
export function validateAppConfig(config: Partial<AppConfig>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Server config validation
  if (config.server) {
    if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
      errors.push({
        field: 'server.port',
        message: 'Server port must be between 1 and 65535',
        value: config.server.port
      });
    }

    if (!config.server.cors) {
      warnings.push({
        field: 'server.cors',
        message: 'CORS origin not specified, will allow all origins',
        value: 'undefined'
      });
    }
  }

  // Database config validation
  if (config.database) {
    if (!config.database.uri) {
      errors.push({
        field: 'database.uri',
        message: 'Database URI is required',
        value: config.database.uri
      });
    }

    if (!config.database.name) {
      errors.push({
        field: 'database.name',
        message: 'Database name is required',
        value: config.database.name
      });
    }
  }

  // Redis config validation
  if (config.redis) {
    if (!config.redis.host) {
      errors.push({
        field: 'redis.host',
        message: 'Redis host is required',
        value: config.redis.host
      });
    }

    if (!config.redis.port || config.redis.port < 1 || config.redis.port > 65535) {
      errors.push({
        field: 'redis.port',
        message: 'Redis port must be between 1 and 65535',
        value: config.redis.port
      });
    }
  }

  // Auth config validation
  if (config.auth) {
    if (!config.auth.jwtSecret || config.auth.jwtSecret.length < 32) {
      errors.push({
        field: 'auth.jwtSecret',
        message: 'JWT secret must be at least 32 characters long',
        value: config.auth.jwtSecret?.length + ' characters'
      });
    }

    if (!config.auth.jwtRefreshSecret || config.auth.jwtRefreshSecret.length < 32) {
      errors.push({
        field: 'auth.jwtRefreshSecret',
        message: 'JWT refresh secret must be at least 32 characters long',
        value: config.auth.jwtRefreshSecret?.length + ' characters'
      });
    }
  }

  // AI services config validation
  if (config.ai) {
    if (!config.ai.openai?.apiKey) {
      errors.push({
        field: 'ai.openai.apiKey',
        message: 'OpenAI API key is required',
        value: config.ai.openai?.apiKey
      });
    }

    if (!config.ai.elevenlabs?.apiKey) {
      errors.push({
        field: 'ai.elevenlabs.apiKey',
        message: 'ElevenLabs API key is required',
        value: config.ai.elevenlabs?.apiKey
      });
    }
  }

  // Storage config validation
  if (config.storage) {
    if (!['aws', 'cloudflare', 'local'].includes(config.storage.provider)) {
      errors.push({
        field: 'storage.provider',
        message: 'Storage provider must be one of: aws, cloudflare, local',
        value: config.storage.provider
      });
    }

    if (config.storage.provider === 'aws' && !config.storage.aws) {
      errors.push({
        field: 'storage.aws',
        message: 'AWS storage configuration is required when provider is "aws"',
        value: config.storage.aws
      });
    }

    if (config.storage.provider === 'cloudflare' && !config.storage.cloudflare) {
      errors.push({
        field: 'storage.cloudflare',
        message: 'Cloudflare storage configuration is required when provider is "cloudflare"',
        value: config.storage.cloudflare
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates required environment variables for production
 */
export function validateProductionConfig(config: Partial<EnvironmentConfig>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (config.NODE_ENV === 'production') {
    // Production-specific validations
    if (!config.CORS_ORIGIN || config.CORS_ORIGIN === '*') {
      errors.push({
        field: 'CORS_ORIGIN',
        message: 'CORS_ORIGIN must be specified and not wildcard (*) in production',
        value: config.CORS_ORIGIN
      });
    }

    if (config.JWT_SECRET && config.JWT_SECRET === 'your-super-secret-jwt-key') {
      errors.push({
        field: 'JWT_SECRET',
        message: 'JWT_SECRET must be changed from default value in production',
        value: 'default value detected'
      });
    }

    if (config.JWT_REFRESH_SECRET && config.JWT_REFRESH_SECRET === 'your-super-secret-refresh-key') {
      errors.push({
        field: 'JWT_REFRESH_SECRET',
        message: 'JWT_REFRESH_SECRET must be changed from default value in production',
        value: 'default value detected'
      });
    }

    if (config.MONGODB_URI && config.MONGODB_URI.includes('localhost')) {
      warnings.push({
        field: 'MONGODB_URI',
        message: 'Consider using a hosted database service in production',
        value: 'localhost detected'
      });
    }

    if (config.REDIS_HOST === 'localhost') {
      warnings.push({
        field: 'REDIS_HOST',
        message: 'Consider using a hosted Redis service in production',
        value: 'localhost'
      });
    }

    if (config.USE_MOCK_SERVICES === true) {
      errors.push({
        field: 'USE_MOCK_SERVICES',
        message: 'Mock services should not be enabled in production',
        value: true
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Logs validation results with appropriate formatting
 */
export function logValidationResults(result: ValidationResult, context: string): void {
  if (result.isValid) {
    console.log(`✅ [Config] ${context} validation passed`);
  } else {
    console.error(`❌ [Config] ${context} validation failed:`);
    result.errors.forEach(error => {
      console.error(`   - ${error.field}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn(`⚠️ [Config] ${context} validation warnings:`);
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning.field}: ${warning.message}`);
    });
  }
}

/**
 * Checks if all required environment variables are present
 */
export function checkRequiredEnvVars(): { missing: string[]; present: string[] } {
  const required = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'REDIS_HOST',
    'REDIS_PORT',
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
    'STORAGE_PROVIDER'
  ];

  const missing = required.filter(key => !process.env[key]);
  const present = required.filter(key => !!process.env[key]);

  return { missing, present };
}
