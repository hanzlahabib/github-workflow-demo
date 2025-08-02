// Storage provider factory using functional approach

import type { StorageProvider, StorageConfig } from './types';
import { createS3Provider } from './aws-s3';
import { createR2Provider } from './cloudflare-r2';

export const createStorageProvider = (config: StorageConfig): StorageProvider => {
  switch (config.provider) {
    case 'aws':
      console.log('[StorageFactory] Creating AWS S3 provider');
      return createS3Provider(config);
    
    case 'r2':
      console.log('[StorageFactory] Creating Cloudflare R2 provider');
      return createR2Provider(config);
    
    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }
};

// Configuration helpers for different providers
export const createS3Config = (
  bucket: string,
  region: string = process.env.AWS_REGION || 'us-east-1'
): StorageConfig => ({
  provider: 'aws',
  bucket,
  region,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

export const createR2Config = (
  bucket: string,
  accountId: string = process.env.R2_ACCOUNT_ID!
): StorageConfig => ({
  provider: 'r2',
  bucket,
  region: 'auto',
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  publicUrl: process.env.R2_PUBLIC_URL,
});

// Environment-based provider creation
export const createProviderFromEnv = (
  providerType?: string,
  bucket?: string
): StorageProvider => {
  const provider = providerType || process.env.STORAGE_PROVIDER || 'aws';
  
  switch (provider) {
    case 'aws': {
      const bucketName = bucket || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
      if (!bucketName) {
        throw new Error('AWS S3 bucket name not configured');
      }
      return createStorageProvider(createS3Config(bucketName));
    }
    
    case 'r2': {
      const bucketName = bucket || process.env.R2_BUCKET_NAME;
      const accountId = process.env.R2_ACCOUNT_ID;
      if (!bucketName || !accountId) {
        throw new Error('R2 bucket name or account ID not configured');
      }
      return createStorageProvider(createR2Config(bucketName, accountId));
    }
    
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
};

// Utility function to switch providers at runtime
export const switchProvider = (
  currentProvider: StorageProvider,
  newProviderType: 'aws' | 'r2',
  bucket?: string
): StorageProvider => {
  console.log(`[StorageFactory] Switching to ${newProviderType} provider`);
  return createProviderFromEnv(newProviderType, bucket);
};