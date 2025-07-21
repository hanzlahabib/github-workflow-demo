// External dependencies
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsCommand, HeadObjectCommand, CopyObjectCommand, HeadBucketCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

// Audio storage imports
import { getAudioStorageConfig, calculateExpiryDate, AUDIO_PATHS, type AudioType, AUDIO_CONTENT_TYPES } from '../config/audioStorage';

// Node.js built-in modules
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Types
import type { S3Config, S3UploadOptions, S3UploadResponse } from '@/types/services';

// Extended upload options for backward compatibility
export interface UploadOptions extends S3UploadOptions {
  serverSideEncryption?: 'AES256' | 'aws:kms';
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'DEEP_ARCHIVE';
  expires?: Date;
  forcePathStyle?: boolean;
  signatureVersion?: string;
}

// Use centralized type with additional fields
export interface UploadResult extends S3UploadResponse {
  location: string;
  bucket: string;
  size?: number;
  contentType?: string;
}

export interface DownloadOptions {
  range?: string; // e.g., 'bytes=0-1023'
  versionId?: string;
  ifModifiedSince?: Date;
  ifUnmodifiedSince?: Date;
  ifMatch?: string;
  ifNoneMatch?: string;
}

export interface ListObjectsOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  marker?: string;
  encodingType?: 'url';
}

export interface S3Object {
  key: string;
  lastModified: Date;
  etag: string;
  size: number;
  storageClass: string;
  owner?: {
    displayName: string;
    id: string;
  };
}

export interface SignedUrlOptions {
  expires?: number; // Expiration time in seconds (default: 3600)
  httpMethod?: 'GET' | 'PUT' | 'POST' | 'DELETE';
  contentType?: string;
  contentMD5?: string;
  responseContentDisposition?: string;
  responseContentType?: string;
}

export interface MultipartUploadOptions {
  partSize?: number; // Default: 5MB
  queueSize?: number; // Default: 4
  metadata?: { [key: string]: string };
  acl?: string;
  storageClass?: string;
}

class S3Service {
  private s3: S3Client;
  private bucketName: string;
  private region: string;

  constructor(config: S3Config) {
    this.bucketName = config.bucketName;
    this.region = config.region;

    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle || false,
      requestHandler: {
        requestTimeout: 120000, // 2 minutes
        connectionTimeout: 60000, // 1 minute
      },
    });
  }

  async uploadFile(filePath: string, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      console.log(`[S3] Uploading file: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileStats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);
      const fileName = path.basename(filePath);
      const key = options.key || this.generateKey(fileName);
      const contentType = options.contentType || this.getContentType(fileName);

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        ACL: options.acl || 'private',
        Metadata: options.metadata || {},
        ServerSideEncryption: options.serverSideEncryption,
        StorageClass: options.storageClass,
        Expires: options.expires,
      };

      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3.send(command);

      console.log(`[S3] File uploaded successfully: ${key}`);

      const location = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      return {
        key,
        url: location,
        etag: result.ETag,
        location: location,
        bucket: this.bucketName,
        size: fileStats.size,
        contentType,
      };
    } catch (error) {
      console.error('[S3] File upload failed:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadBuffer(buffer: Buffer, fileName: string, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      console.log(`[S3] Uploading buffer as: ${fileName}`);

      const key = options.key || this.generateKey(fileName);
      const contentType = options.contentType || this.getContentType(fileName);

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: options.acl || 'private',
        Metadata: options.metadata || {},
        ServerSideEncryption: options.serverSideEncryption,
        StorageClass: options.storageClass,
      };

      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3.send(command);

      console.log(`[S3] Buffer uploaded successfully: ${key}`);

      const location = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      return {
        key,
        url: location,
        etag: result.ETag,
        location: location,
        bucket: this.bucketName,
        size: buffer.length,
        contentType,
      };
    } catch (error) {
      console.error('[S3] Buffer upload failed:', error);
      throw new Error(`Buffer upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadFile(key: string, localPath: string, options: DownloadOptions = {}): Promise<string> {
    try {
      console.log(`[S3] Downloading file: ${key} to ${localPath}`);

      const downloadParams = {
        Bucket: this.bucketName,
        Key: key,
        ...options,
      };

      const command = new GetObjectCommand(downloadParams);
      const result = await this.s3.send(command);

      if (!result.Body) {
        throw new Error('No data received from S3');
      }

      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of result.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(localPath, buffer);

      console.log(`[S3] File downloaded successfully: ${localPath}`);
      return localPath;
    } catch (error) {
      console.error('[S3] File download failed:', error);
      throw new Error(`File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadBuffer(key: string, options: DownloadOptions = {}): Promise<Buffer> {
    try {
      console.log(`[S3] Downloading buffer: ${key}`);

      const downloadParams = {
        Bucket: this.bucketName,
        Key: key,
        ...options,
      };

      const command = new GetObjectCommand(downloadParams);
      const result = await this.s3.send(command);

      if (!result.Body) {
        throw new Error('No data received from S3');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of result.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      console.log(`[S3] Buffer downloaded successfully: ${key}`);
      return buffer;
    } catch (error) {
      console.error('[S3] Buffer download failed:', error);
      throw new Error(`Buffer download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      console.log(`[S3] Deleting file: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3.send(command);

      console.log(`[S3] File deleted successfully: ${key}`);
    } catch (error) {
      console.error('[S3] File deletion failed:', error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    try {
      console.log(`[S3] Deleting ${keys.length} files`);

      const deleteParams = {
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false,
        },
      };

      const command = new DeleteObjectsCommand(deleteParams);
      const result = await this.s3.send(command);

      if (result.Errors && result.Errors.length > 0) {
        console.warn('[S3] Some files failed to delete:', result.Errors);
      }

      console.log(`[S3] Files deleted successfully`);
    } catch (error) {
      console.error('[S3] Bulk file deletion failed:', error);
      throw new Error(`Bulk file deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listObjects(options: ListObjectsOptions = {}): Promise<S3Object[]> {
    try {
      console.log('[S3] Listing objects');

      const listParams = {
        Bucket: this.bucketName,
        ...options,
      };

      const command = new ListObjectsCommand(listParams);
      const result = await this.s3.send(command);

      const objects: S3Object[] = (result.Contents || []).map(obj => ({
        key: obj.Key!,
        lastModified: obj.LastModified!,
        etag: obj.ETag!,
        size: obj.Size!,
        storageClass: obj.StorageClass!,
        owner: obj.Owner ? {
          displayName: obj.Owner.DisplayName!,
          id: obj.Owner.ID!,
        } : undefined,
      }));

      console.log(`[S3] Found ${objects.length} objects`);
      return objects;
    } catch (error) {
      console.error('[S3] List objects failed:', error);
      throw new Error(`List objects failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedUrl(key: string, operation: 'getObject' | 'putObject' = 'getObject', options: SignedUrlOptions = {}): Promise<string> {
    try {
      console.log(`[S3] Generating signed URL for: ${key}`);

      const params: any = {
        Bucket: this.bucketName,
        Key: key,
        Expires: options.expires || 3600, // 1 hour default
      };

      if (options.contentType) {
        params.ContentType = options.contentType;
      }

      if (options.contentMD5) {
        params.ContentMD5 = options.contentMD5;
      }

      if (options.responseContentDisposition) {
        params.ResponseContentDisposition = options.responseContentDisposition;
      }

      if (options.responseContentType) {
        params.ResponseContentType = options.responseContentType;
      }

      const command = operation === 'putObject' ? new PutObjectCommand(params) : new GetObjectCommand(params);
      const url = await getSignedUrl(this.s3, command, { expiresIn: params.Expires });

      console.log(`[S3] Signed URL generated successfully`);
      return url;
    } catch (error) {
      console.error('[S3] Signed URL generation failed:', error);
      throw new Error(`Signed URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPresignedPost(key: string, options: {
    expires?: number;
    conditions?: any[];
    fields?: { [key: string]: string };
  } = {}): Promise<{ url: string; fields: { [key: string]: string } }> {
    try {
      console.log(`[S3] Generating presigned POST for: ${key}`);

      const result = await createPresignedPost(this.s3, {
        Bucket: this.bucketName,
        Key: key,
        Expires: options.expires || 3600,
        Conditions: options.conditions || [],
        Fields: options.fields || {},
      });

      console.log(`[S3] Presigned POST generated successfully`);
      return result;
    } catch (error) {
      console.error('[S3] Presigned POST generation failed:', error);
      throw new Error(`Presigned POST generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async copyObject(sourceKey: string, destinationKey: string, sourceBucket?: string): Promise<void> {
    try {
      console.log(`[S3] Copying object from ${sourceKey} to ${destinationKey}`);

      const copySource = sourceBucket ? `${sourceBucket}/${sourceKey}` : `${this.bucketName}/${sourceKey}`;

      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: copySource,
        Key: destinationKey,
      });
      await this.s3.send(command);

      console.log(`[S3] Object copied successfully`);
    } catch (error) {
      console.error('[S3] Object copy failed:', error);
      throw new Error(`Object copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async headObject(key: string) {
    try {
      console.log(`[S3] Getting object metadata: ${key}`);

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const result = await this.s3.send(command);

      console.log(`[S3] Object metadata retrieved successfully`);
      return result;
    } catch (error) {
      console.error('[S3] Head object failed:', error);
      throw new Error(`Head object failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.headObject(key);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  generateVideoKey(userId: string, videoId: string, extension: string = 'mp4'): string {
    return `videos/${userId}/${videoId}/output.${extension}`;
  }

  generateAssetKey(userId: string, assetType: 'audio' | 'image' | 'font' | 'subtitle', fileName: string): string {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    return `assets/${userId}/${assetType}/${timestamp}-${randomId}-${baseName}${extension}`;
  }

  generateThumbnailKey(userId: string, videoId: string): string {
    return `thumbnails/${userId}/${videoId}/thumbnail.jpg`;
  }

  private generateKey(fileName: string): string {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    return `uploads/${timestamp}-${randomId}-${baseName}${extension}`;
  }

  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      // Videos
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',

      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',

      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',

      // Subtitles
      '.srt': 'text/plain',
      '.vtt': 'text/vtt',
      '.ass': 'text/plain',
      '.ssa': 'text/plain',

      // Fonts
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',

      // Documents
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  async testConnection(): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3.send(command);
      return true;
    } catch (error) {
      console.error('[S3] Connection test failed:', error);
      return false;
    }
  }

  getBucketName(): string {
    return this.bucketName;
  }

  getRegion(): string {
    return this.region;
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  // ==========================================
  // AUDIO-SPECIFIC METHODS
  // ==========================================

  /**
   * Generate audio storage key based on type and user
   */
  generateAudioKey(userId: string, type: AudioType, id?: string): string {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(4).toString('hex');

    switch (type) {
      case 'voiceover':
        return `${AUDIO_PATHS.VOICEOVERS}/${userId}/${timestamp}_${id || randomId}.mp3`;
      case 'message':
        return `${AUDIO_PATHS.MESSAGES}/${userId}/${id}_${timestamp}.mp3`;
      case 'preview':
        return `${AUDIO_PATHS.PREVIEWS}/${userId}/temp_${timestamp}_${id || randomId}.mp3`;
      case 'system':
        return `${AUDIO_PATHS.SYSTEM}/${id || 'sample'}_${randomId}.mp3`;
      default:
        return `audio/misc/${userId}/${timestamp}_${randomId}.mp3`;
    }
  }

  /**
   * Upload audio with environment-specific configuration and metadata
   */
  async uploadAudioWithMetadata(
    buffer: Buffer,
    type: AudioType,
    userId: string,
    metadata: {
      id?: string;
      voiceId?: string;
      duration?: number;
      originalFilename?: string;
      [key: string]: any;
    } = {}
  ): Promise<UploadResult & { expiresAt?: Date }> {
    try {
      const config = getAudioStorageConfig();
      const key = this.generateAudioKey(userId, type, metadata.id || metadata.voiceId);
      const expiryDate = calculateExpiryDate(type);

      console.log(`[S3Audio] Uploading ${type} audio: ${key}`);

      const uploadParams = {
        Bucket: config.bucket, // Use environment-specific bucket
        Key: key,
        Body: buffer,
        ContentType: AUDIO_CONTENT_TYPES.mp3,
        ACL: config.acl,
        Metadata: {
          'user-id': userId,
          'content-type': type,
          'generated-at': new Date().toISOString(),
          'expires-at': expiryDate ? expiryDate.toISOString() : 'never',
          'voice-id': metadata.voiceId || 'unknown',
          'duration': metadata.duration?.toString() || '0',
          'original-filename': metadata.originalFilename || '',
          'environment': process.env.NODE_ENV || 'development',
          ...Object.fromEntries(
            Object.entries(metadata).map(([k, v]) => [k, String(v)])
          )
        }
      };

      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3.send(command);

      // Generate appropriate URL based on ACL
      const url = config.acl === 'public-read'
        ? `https://${config.bucket}.s3.${this.region}.amazonaws.com/${key}`
        : await this.getSignedUrl(key, 'getObject', { expires: config.signedUrlExpiry });

      console.log(`[S3Audio] ${type} audio uploaded successfully: ${key}`);

      return {
        key,
        url,
        etag: result.ETag,
        location: url,
        bucket: config.bucket,
        size: buffer.length,
        contentType: AUDIO_CONTENT_TYPES.mp3,
        expiresAt: expiryDate || undefined
      };
    } catch (error) {
      console.error(`[S3Audio] Failed to upload ${type} audio:`, error);
      throw new Error(`Audio upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get signed URL for audio with appropriate expiry based on environment
   */
  async getAudioSignedUrl(key: string, operation: 'getObject' | 'putObject' = 'getObject'): Promise<string> {
    const config = getAudioStorageConfig();
    return this.getSignedUrl(key, operation, { expires: config.signedUrlExpiry });
  }

  /**
   * List audio files for cleanup based on expiry metadata
   */
  async listExpiredAudio(): Promise<Array<{ key: string; expiresAt: Date }>> {
    try {
      console.log('[S3Audio] Scanning for expired audio files...');

      const expiredFiles: Array<{ key: string; expiresAt: Date }> = [];
      const objects = await this.listObjects({ prefix: 'audio/' });

      for (const obj of objects) {
        try {
          const metadata = await this.headObject(obj.key);
          const expiresAtStr = metadata.Metadata?.['expires-at'];

          if (expiresAtStr && expiresAtStr !== 'never') {
            const expiresAt = new Date(expiresAtStr);
            if (expiresAt < new Date()) {
              expiredFiles.push({ key: obj.key, expiresAt });
            }
          }
        } catch (error) {
          console.warn(`[S3Audio] Could not check expiry for ${obj.key}:`, error);
        }
      }

      console.log(`[S3Audio] Found ${expiredFiles.length} expired audio files`);
      return expiredFiles;
    } catch (error) {
      console.error('[S3Audio] Failed to list expired audio:', error);
      throw error;
    }
  }

  /**
   * Clean up expired audio files
   */
  async cleanupExpiredAudio(): Promise<{ deletedCount: number; errors: string[] }> {
    try {
      console.log('[S3Audio] Starting expired audio cleanup...');

      const expiredFiles = await this.listExpiredAudio();

      if (expiredFiles.length === 0) {
        console.log('[S3Audio] No expired audio files found');
        return { deletedCount: 0, errors: [] };
      }

      const errors: string[] = [];
      let deletedCount = 0;

      // Delete in batches of 1000 (S3 limit)
      const batchSize = 1000;
      for (let i = 0; i < expiredFiles.length; i += batchSize) {
        const batch = expiredFiles.slice(i, i + batchSize);
        const keys = batch.map(file => file.key);

        try {
          await this.deleteFiles(keys);
          deletedCount += keys.length;
          console.log(`[S3Audio] Deleted batch of ${keys.length} expired audio files`);
        } catch (error) {
          const errorMsg = `Failed to delete batch: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('[S3Audio]', errorMsg);
        }
      }

      console.log(`[S3Audio] Cleanup completed: ${deletedCount} files deleted, ${errors.length} errors`);
      return { deletedCount, errors };
    } catch (error) {
      console.error('[S3Audio] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get audio storage statistics for monitoring
   */
  async getAudioStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<AudioType, number>;
    expiringSoon: number; // files expiring in next 24 hours
  }> {
    try {
      const objects = await this.listObjects({ prefix: 'audio/' });
      const stats = {
        totalFiles: objects.length,
        totalSize: objects.reduce((sum, obj) => sum + obj.size, 0),
        filesByType: { voiceover: 0, message: 0, preview: 0, system: 0 } as Record<AudioType, number>,
        expiringSoon: 0
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const obj of objects) {
        // Categorize by path
        if (obj.key.includes('/voiceovers/')) stats.filesByType.voiceover++;
        else if (obj.key.includes('/messages/')) stats.filesByType.message++;
        else if (obj.key.includes('/previews/')) stats.filesByType.preview++;
        else if (obj.key.includes('/system/')) stats.filesByType.system++;

        // Check expiry
        try {
          const metadata = await this.headObject(obj.key);
          const expiresAtStr = metadata.Metadata?.['expires-at'];
          if (expiresAtStr && expiresAtStr !== 'never') {
            const expiresAt = new Date(expiresAtStr);
            if (expiresAt <= tomorrow) {
              stats.expiringSoon++;
            }
          }
        } catch {
          // Ignore metadata errors for stats
        }
      }

      return stats;
    } catch (error) {
      console.error('[S3Audio] Failed to get storage stats:', error);
      throw error;
    }
  }
}

// Singleton instance
let s3Instance: S3Service | null = null;

export const createS3Service = (config: S3Config): S3Service => {
  if (!s3Instance) {
    s3Instance = new S3Service(config);
  }
  return s3Instance;
};

export const getS3Service = (): S3Service => {
  if (!s3Instance) {
    throw new Error('S3 service not initialized. Call createS3Service first.');
  }
  return s3Instance;
};

export default S3Service;
