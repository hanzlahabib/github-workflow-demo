// Cloudflare R2 storage provider implementation using functional approach

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, StorageConfig, StorageUploadOptions, StorageUploadResult, StorageDeleteResult, StorageListResult } from './types';

export const createR2Provider = (config: StorageConfig): StorageProvider => {
  // R2 uses S3-compatible API
  const r2Client = new S3Client({
    region: 'auto', // R2 uses 'auto' as region
    endpoint: config.endpoint, // R2 endpoint
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // Required for R2
  });

  const upload = async (
    buffer: Buffer,
    key: string,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> => {
    try {
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
        CacheControl: options.cacheControl || 'public, max-age=31536000', // 1 year default for R2
        Expires: options.expires,
      });

      const result = await r2Client.send(command);
      
      return {
        success: true,
        key,
        url: getPublicUrl(key),
        size: buffer.length,
        etag: result.ETag,
      };
    } catch (error) {
      console.error('[R2Provider] Upload failed:', error);
      return {
        success: false,
        key,
        url: '',
        size: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  };

  const deleteFile = async (key: string): Promise<StorageDeleteResult> => {
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      });

      await r2Client.send(command);
      
      return {
        success: true,
        key,
      };
    } catch (error) {
      console.error('[R2Provider] Delete failed:', error);
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  };

  const getSignedUrlForFile = async (
    key: string,
    expiresIn: number = 3600
  ): Promise<string> => {
    try {
      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      });

      return await getSignedUrl(r2Client, command, { expiresIn });
    } catch (error) {
      console.error('[R2Provider] Signed URL generation failed:', error);
      throw error;
    }
  };

  const list = async (
    prefix?: string,
    maxKeys: number = 1000
  ): Promise<StorageListResult> => {
    try {
      const command = new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const result = await r2Client.send(command);
      
      return {
        success: true,
        files: (result.Contents || []).map(obj => ({
          key: obj.Key!,
          size: obj.Size!,
          lastModified: obj.LastModified!,
          etag: obj.ETag!,
        })),
      };
    } catch (error) {
      console.error('[R2Provider] List failed:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'List failed',
      };
    }
  };

  const exists = async (key: string): Promise<boolean> => {
    try {
      const command = new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      });

      await r2Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      console.error('[R2Provider] Exists check failed:', error);
      throw error;
    }
  };

  const getPublicUrl = (key: string): string => {
    // Use custom public URL if provided, otherwise construct from bucket and endpoint
    if (config.publicUrl) {
      return `${config.publicUrl}/${key}`;
    }
    
    // Fallback to constructed URL (may not work without custom domain)
    return `https://${config.bucket}.${config.endpoint?.replace('https://', '')}//${key}`;
  };

  return {
    upload,
    delete: deleteFile,
    getSignedUrl: getSignedUrlForFile,
    list,
    exists,
    getPublicUrl,
  };
};