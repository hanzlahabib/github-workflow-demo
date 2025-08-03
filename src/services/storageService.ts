// Unified storage service using the storage abstraction layer

import type { StorageProvider, StorageUploadResult, StorageDeleteResult } from './storage';
import { createProviderFromEnv, switchProvider } from './storage';

// Global storage provider instance
let storageProvider: StorageProvider | null = null;

// Initialize storage provider from environment
export const initializeStorage = (providerType?: string, bucket?: string): StorageProvider => {
  console.log('[StorageService] Initializing storage provider...', { providerType, bucket });
  storageProvider = createProviderFromEnv(providerType, bucket);
  return storageProvider;
};

// Get current storage provider (initialize if not exists)
export const getStorageProvider = (): StorageProvider => {
  if (!storageProvider) {
    storageProvider = initializeStorage();
  }
  return storageProvider;
};

// Switch storage provider at runtime
export const switchStorageProvider = (newProviderType: 'aws' | 'r2', bucket?: string): StorageProvider => {
  const currentProvider = getStorageProvider();
  storageProvider = switchProvider(currentProvider, newProviderType, bucket);
  return storageProvider;
};

// Convenience functions that use the current provider
export const uploadFile = async (
  buffer: Buffer,
  key: string,
  contentType?: string,
  metadata?: Record<string, string>
): Promise<StorageUploadResult> => {
  const provider = getStorageProvider();
  return provider.upload(buffer, key, { contentType, metadata });
};

export const uploadBuffer = async (
  buffer: Buffer,
  key: string,
  options: { contentType?: string; metadata?: Record<string, string> } = {}
): Promise<StorageUploadResult> => {
  const provider = getStorageProvider();
  return provider.upload(buffer, key, options);
};

export const deleteFile = async (key: string): Promise<StorageDeleteResult> => {
  const provider = getStorageProvider();
  return provider.delete(key);
};

export const getSignedUrl = async (key: string, expiresIn?: number): Promise<string> => {
  // Return public URL since buckets are now public (no signing needed)
  const provider = getStorageProvider();
  return provider.getPublicUrl(key);
};

export const getPublicUrl = (key: string): string => {
  const provider = getStorageProvider();
  return provider.getPublicUrl(key);
};

export const fileExists = async (key: string): Promise<boolean> => {
  const provider = getStorageProvider();
  return provider.exists(key);
};

export const listFiles = async (prefix?: string, maxKeys?: number) => {
  const provider = getStorageProvider();
  return provider.list(prefix, maxKeys);
};

// Health check function
export const healthCheck = async (): Promise<{ provider: string; bucket: string; healthy: boolean; error?: string }> => {
  try {
    const provider = getStorageProvider();
    const testKey = `health-check-${Date.now()}.txt`;
    const testBuffer = Buffer.from('health check', 'utf8');
    
    // Try to upload and delete a test file
    const uploadResult = await provider.upload(testBuffer, testKey, { contentType: 'text/plain' });
    
    if (uploadResult.success) {
      await provider.delete(testKey);
      return {
        provider: process.env.STORAGE_PROVIDER || 'aws',
        bucket: process.env.STORAGE_PROVIDER === 'r2' 
          ? process.env.R2_BUCKET_NAME || 'unknown' 
          : process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || 'unknown',
        healthy: true,
      };
    } else {
      return {
        provider: process.env.STORAGE_PROVIDER || 'aws',
        bucket: 'unknown',
        healthy: false,
        error: uploadResult.error,
      };
    }
  } catch (error) {
    return {
      provider: process.env.STORAGE_PROVIDER || 'aws',
      bucket: 'unknown',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Storage provider info function
export const getProviderInfo = () => {
  const providerType = process.env.STORAGE_PROVIDER || 'aws';
  const bucket = providerType === 'r2' 
    ? process.env.R2_BUCKET_NAME 
    : process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
  
  return {
    provider: providerType,
    bucket,
    region: providerType === 'r2' ? 'auto' : process.env.AWS_REGION,
    endpoint: providerType === 'r2' ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
    publicUrl: providerType === 'r2' ? process.env.R2_PUBLIC_URL : undefined,
  };
};