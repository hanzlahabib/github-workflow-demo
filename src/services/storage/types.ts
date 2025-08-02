// Storage abstraction types for AWS S3 and Cloudflare R2

export interface StorageConfig {
  provider: 'aws' | 'r2';
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // For R2
  publicUrl?: string; // For R2 public access
}

export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  expires?: Date;
}

export interface StorageUploadResult {
  success: boolean;
  key: string;
  url: string;
  size: number;
  etag?: string;
  error?: string;
}

export interface StorageDeleteResult {
  success: boolean;
  key: string;
  error?: string;
}

export interface StorageListResult {
  success: boolean;
  files: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
  }>;
  error?: string;
}

export interface StorageProvider {
  upload: (
    buffer: Buffer,
    key: string,
    options?: StorageUploadOptions
  ) => Promise<StorageUploadResult>;
  
  delete: (key: string) => Promise<StorageDeleteResult>;
  
  getSignedUrl: (
    key: string,
    expiresIn?: number
  ) => Promise<string>;
  
  list: (
    prefix?: string,
    maxKeys?: number
  ) => Promise<StorageListResult>;
  
  exists: (key: string) => Promise<boolean>;
  
  getPublicUrl: (key: string) => string;
}