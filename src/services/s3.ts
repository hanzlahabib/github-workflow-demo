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
  partSize?: number; // Default: 5MB (minimum for S3)
  queueSize?: number; // Default: 4 (concurrent parts)
  metadata?: { [key: string]: string };
  acl?: string;
  storageClass?: string;
  onProgress?: (progress: UploadProgress) => void;
  enableRetry?: boolean;
  maxRetries?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  parts: {
    completed: number;
    total: number;
  };
  speed?: number; // bytes per second
  eta?: number; // estimated time to completion in seconds
}

export interface MultipartUploadResult extends UploadResult {
  uploadId: string;
  parts: Array<{
    partNumber: number;
    etag: string;
    size: number;
  }>;
  totalParts: number;
  uploadTime: number; // milliseconds
}

export interface S3PerformanceMetrics {
  operation: string;
  duration: number; // milliseconds
  size?: number; // bytes
  throughput?: number; // bytes per second
  retryCount?: number;
  concurrency?: number;
  partCount?: number;
}

class S3Service {
  private s3: S3Client;
  private bucketName: string;
  private region: string;
  private publicUrl?: string;
  private readonly MIN_MULTIPART_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly DEFAULT_PART_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_CONCURRENT_PARTS = 10;
  private readonly DEFAULT_MAX_RETRIES = 3;
  private performanceMetrics: S3PerformanceMetrics[] = [];

  constructor(config: S3Config) {
    this.bucketName = config.bucketName;
    this.region = config.region;
    this.publicUrl = config.publicUrl;

    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle || false,
      requestHandler: {
        requestTimeout: 300000, // 5 minutes for large video uploads
        connectionTimeout: 30000, // 30 seconds for connection
      },
    });
  }

  async uploadFile(filePath: string, options: UploadOptions = {}): Promise<UploadResult> {
    const startTime = Date.now();
    
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
        Metadata: options.metadata || {},
        ServerSideEncryption: options.serverSideEncryption,
        StorageClass: options.storageClass,
        Expires: options.expires,
      };

      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3.send(command);

      const uploadTime = Date.now() - startTime;
      
      // Record performance metrics
      this.recordMetrics({
        operation: 'single_upload',
        duration: uploadTime,
        size: fileStats.size,
        throughput: fileStats.size / (uploadTime / 1000)
      });

      console.log(`[S3] File uploaded successfully: ${key}`);

      const location = this.getPublicUrl(key);
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
        Metadata: options.metadata || {},
        ServerSideEncryption: options.serverSideEncryption,
        StorageClass: options.storageClass,
      };

      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3.send(command);

      console.log(`[S3] Buffer uploaded successfully: ${key}`);

      const location = this.getPublicUrl(key);
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

  async deleteFile(key: string, maxRetries?: number): Promise<void> {
    try {
      console.log(`[S3] Deleting file: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      const { result: deleteResult, retryCount } = await this.retryOperation(
        () => this.s3.send(command),
        maxRetries || this.DEFAULT_MAX_RETRIES
      );

      console.log(`[S3] File deleted successfully: ${key}`);
    } catch (error) {
      console.error('[S3] File deletion failed:', error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFiles(keys: string[], maxRetries?: number): Promise<{
    deleted: string[];
    errors: Array<{ key: string; code: string; message: string }>;
  }> {
    if (keys.length === 0) {
      return { deleted: [], errors: [] };
    }

    try {
      console.log(`[S3] Deleting ${keys.length} files`);

      const deleted: string[] = [];
      const errors: Array<{ key: string; code: string; message: string }> = [];
      
      // Process in batches of 1000 (S3 limit for bulk delete)
      const batchSize = 1000;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        const deleteParams = {
          Bucket: this.bucketName,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: false,
          },
        };

        const command = new DeleteObjectsCommand(deleteParams);
        
        try {
          const { result } = await this.retryOperation(
            () => this.s3.send(command),
            maxRetries || this.DEFAULT_MAX_RETRIES
          );

          // Track successful deletions
          if (result.Deleted) {
            result.Deleted.forEach(del => {
              if (del.Key) {
                deleted.push(del.Key);
              }
            });
          }

          // Track errors
          if (result.Errors && result.Errors.length > 0) {
            result.Errors.forEach(err => {
              if (err.Key && err.Code && err.Message) {
                errors.push({
                  key: err.Key,
                  code: err.Code,
                  message: err.Message
                });
              }
            });
          }
        } catch (batchError) {
          // If batch fails entirely, mark all keys in batch as failed
          batch.forEach(key => {
            errors.push({
              key,
              code: 'BatchError',
              message: batchError instanceof Error ? batchError.message : 'Unknown batch error'
            });
          });
        }
      }

      console.log(`[S3] Bulk deletion completed: ${deleted.length} deleted, ${errors.length} errors`);
      
      if (errors.length > 0) {
        console.warn('[S3] Some files failed to delete:', errors);
      }

      return { deleted, errors };
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
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  getPublicUrlForBucket(key: string, bucketName: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return `https://${bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  // ==========================================
  // PERFORMANCE OPTIMIZATION UTILITIES
  // ==========================================

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.DEFAULT_MAX_RETRIES,
    baseDelay: number = 1000
  ): Promise<{ result: T; retryCount: number }> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return { result, retryCount: attempt };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`[S3] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Calculate optimal part size for multipart upload
   */
  private calculatePartSize(fileSize: number, maxParts: number = 10000): number {
    // S3 allows maximum 10,000 parts per upload
    // Ensure part size is at least 5MB (S3 minimum) and file fits in maxParts
    let partSize = this.DEFAULT_PART_SIZE;
    
    while (Math.ceil(fileSize / partSize) > maxParts) {
      partSize *= 2;
    }
    
    return Math.max(partSize, this.MIN_MULTIPART_SIZE);
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: S3PerformanceMetrics): void {
    this.performanceMetrics.push({
      ...metrics,
      timestamp: Date.now()
    } as S3PerformanceMetrics & { timestamp: number });
    
    // Keep only last 100 metrics to prevent memory leak
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }

    // Enhanced logging with performance data
    const throughputInfo = metrics.throughput 
      ? ` (${(metrics.throughput / 1024 / 1024).toFixed(2)} MB/s)` 
      : '';
    const sizeInfo = metrics.size 
      ? ` ${(metrics.size / 1024 / 1024).toFixed(2)}MB` 
      : '';
    const retryInfo = metrics.retryCount && metrics.retryCount > 0 
      ? ` (${metrics.retryCount} retries)` 
      : '';
    const concurrencyInfo = metrics.concurrency 
      ? ` (${metrics.concurrency} concurrent)` 
      : '';

    console.log(`[S3Performance] ${metrics.operation}: ${metrics.duration}ms${sizeInfo}${throughputInfo}${retryInfo}${concurrencyInfo}`);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    operations: { [key: string]: { count: number; avgDuration: number; avgThroughput?: number } };
    totalOperations: number;
    last24Hours: S3PerformanceMetrics[];
  } {
    const now = Date.now();
    const last24Hours = this.performanceMetrics.filter(m => 
      (m as any).timestamp > now - 24 * 60 * 60 * 1000
    );

    const operations: { [key: string]: { count: number; avgDuration: number; avgThroughput?: number } } = {};
    
    last24Hours.forEach(metric => {
      if (!operations[metric.operation]) {
        operations[metric.operation] = { count: 0, avgDuration: 0, avgThroughput: 0 };
      }
      
      const op = operations[metric.operation];
      op.count++;
      op.avgDuration = (op.avgDuration * (op.count - 1) + metric.duration) / op.count;
      
      if (metric.throughput) {
        op.avgThroughput = (op.avgThroughput! * (op.count - 1) + metric.throughput) / op.count;
      }
    });

    return {
      operations,
      totalOperations: last24Hours.length,
      last24Hours
    };
  }

  /**
   * Optimized multipart upload for large files
   */
  async uploadFileMultipart(
    filePath: string, 
    options: UploadOptions & MultipartUploadOptions = {}
  ): Promise<MultipartUploadResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[S3] Starting multipart upload: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      
      // Use multipart only for files larger than threshold
      if (fileSize < this.MIN_MULTIPART_SIZE) {
        console.log(`[S3] File size ${fileSize} bytes < ${this.MIN_MULTIPART_SIZE} bytes, using regular upload`);
        const result = await this.uploadFile(filePath, options);
        return {
          ...result,
          uploadId: 'single-part',
          parts: [{ partNumber: 1, etag: result.etag || '', size: fileSize }],
          totalParts: 1,
          uploadTime: Date.now() - startTime
        };
      }

      const fileName = path.basename(filePath);
      const key = options.key || this.generateKey(fileName);
      const contentType = options.contentType || this.getContentType(fileName);
      const partSize = options.partSize || this.calculatePartSize(fileSize);
      const totalParts = Math.ceil(fileSize / partSize);
      const maxRetries = options.maxRetries || this.DEFAULT_MAX_RETRIES;
      
      console.log(`[S3] Multipart upload config: ${totalParts} parts of ${(partSize / 1024 / 1024).toFixed(2)}MB each`);

      // Step 1: Initialize multipart upload
      const createMultipartParams = {
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        Metadata: options.metadata || {},
        ServerSideEncryption: options.serverSideEncryption,
        StorageClass: options.storageClass,
      };

      const createCommand = new CreateMultipartUploadCommand(createMultipartParams);
      const { result: createResult } = await this.retryOperation(
        () => this.s3.send(createCommand),
        maxRetries
      );
      const uploadId = createResult.UploadId;

      if (!uploadId) {
        throw new Error('Failed to initialize multipart upload');
      }

      console.log(`[S3] Multipart upload initialized: ${uploadId}`);

      try {
        // Step 2: Upload parts concurrently with controlled concurrency
        const parts = await this.uploadPartsStreaming(
          filePath,
          uploadId,
          key,
          fileSize,
          partSize,
          totalParts,
          options
        );

        // Step 3: Complete multipart upload
        const completeParams = {
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map(part => ({
              ETag: part.etag,
              PartNumber: part.partNumber,
            })),
          },
        };

        const completeCommand = new CompleteMultipartUploadCommand(completeParams);
        const { result } = await this.retryOperation(
          () => this.s3.send(completeCommand),
          maxRetries
        );

        const uploadTime = Date.now() - startTime;
        const location = this.getPublicUrl(key);

        // Record performance metrics
        this.recordMetrics({
          operation: 'multipart_upload',
          duration: uploadTime,
          size: fileSize,
          throughput: fileSize / (uploadTime / 1000),
          concurrency: options.queueSize || 4,
          partCount: totalParts
        });

        console.log(`[S3] Multipart upload completed in ${uploadTime}ms: ${key}`);

        return {
          key,
          url: location,
          etag: result.ETag,
          location,
          bucket: this.bucketName,
          size: fileSize,
          contentType,
          uploadId,
          parts,
          totalParts,
          uploadTime,
        };

      } catch (error) {
        // Abort multipart upload on failure
        console.error('[S3] Multipart upload failed, aborting:', error);
        await this.abortMultipartUpload(uploadId, key);
        throw error;
      }

    } catch (error) {
      console.error('[S3] Multipart upload failed:', error);
      throw new Error(`Multipart upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload parts using streaming with controlled concurrency
   */
  private async uploadPartsStreaming(
    filePath: string,
    uploadId: string,
    key: string,
    fileSize: number,
    partSize: number,
    totalParts: number,
    options: MultipartUploadOptions
  ): Promise<Array<{ partNumber: number; etag: string; size: number }>> {
    const parts: Array<{ partNumber: number; etag: string; size: number }> = [];
    const concurrency = Math.min(options.queueSize || 4, this.MAX_CONCURRENT_PARTS);
    const maxRetries = options.maxRetries || this.DEFAULT_MAX_RETRIES;
    
    let completedParts = 0;
    let uploadedBytes = 0;
    const startTime = Date.now();

    // Create upload tasks
    const uploadTasks = Array.from({ length: totalParts }, (_, index) => {
      const partNumber = index + 1;
      const start = index * partSize;
      const end = Math.min(start + partSize - 1, fileSize - 1);
      const currentPartSize = end - start + 1;

      return async (): Promise<{ partNumber: number; etag: string; size: number }> => {
        const partStartTime = Date.now();
        
        // Create readable stream for this part
        const partStream = fs.createReadStream(filePath, { 
          start, 
          end,
          highWaterMark: 64 * 1024 // 64KB chunks for better memory efficiency
        });

        const uploadPartParams = {
          Bucket: this.bucketName,
          Key: key,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: partStream,
          ContentLength: currentPartSize,
        };

        const uploadPartCommand = new UploadPartCommand(uploadPartParams);
        const { result } = await this.retryOperation(
          () => this.s3.send(uploadPartCommand),
          maxRetries
        );

        if (!result.ETag) {
          throw new Error(`Part ${partNumber} upload failed: no ETag returned`);
        }

        completedParts++;
        uploadedBytes += currentPartSize;

        // Calculate and report progress
        if (options.onProgress) {
          const elapsed = Date.now() - startTime;
          const speed = uploadedBytes / (elapsed / 1000); // bytes per second
          const eta = (fileSize - uploadedBytes) / speed;

          options.onProgress({
            loaded: uploadedBytes,
            total: fileSize,
            percentage: (uploadedBytes / fileSize) * 100,
            parts: {
              completed: completedParts,
              total: totalParts,
            },
            speed,
            eta,
          });
        }

        const partTime = Date.now() - partStartTime;
        console.log(`[S3] Part ${partNumber}/${totalParts} uploaded in ${partTime}ms (${(currentPartSize / 1024 / 1024).toFixed(2)}MB)`);

        return {
          partNumber,
          etag: result.ETag,
          size: currentPartSize,
        };
      };
    });

    // Execute uploads with controlled concurrency
    const results = await this.executeConcurrent(uploadTasks, concurrency);
    
    // Sort parts by part number to ensure correct order
    return results.sort((a, b) => a.partNumber - b.partNumber);
  }

  /**
   * Execute tasks with controlled concurrency
   */
  private async executeConcurrent<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let currentIndex = 0;

    // Function to process tasks
    const processTasks = async (): Promise<void> => {
      while (currentIndex < tasks.length) {
        const index = currentIndex++;
        const task = tasks[index];
        try {
          results[index] = await task();
        } catch (error) {
          // Re-throw error to be caught by Promise.all
          throw error;
        }
      }
    };

    // Create workers equal to concurrency limit
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => processTasks());
    
    await Promise.all(workers);
    return results;
  }

  /**
   * Abort multipart upload
   */
  private async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    try {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      });
      
      await this.s3.send(abortCommand);
      console.log(`[S3] Multipart upload aborted: ${uploadId}`);
    } catch (error) {
      console.error('[S3] Failed to abort multipart upload:', error);
    }
  }

  /**
   * Enhanced upload method that automatically chooses between regular and multipart upload
   */
  async uploadFileOptimized(
    filePath: string, 
    options: UploadOptions & MultipartUploadOptions = {}
  ): Promise<UploadResult | MultipartUploadResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    // Use multipart upload for files larger than 5MB
    if (fileSize >= this.MIN_MULTIPART_SIZE) {
      console.log(`[S3] Using multipart upload for ${(fileSize / 1024 / 1024).toFixed(2)}MB file`);
      return this.uploadFileMultipart(filePath, options);
    } else {
      console.log(`[S3] Using regular upload for ${(fileSize / 1024 / 1024).toFixed(2)}MB file`);
      return this.uploadFile(filePath, options);
    }
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

      // Generate appropriate URL based on ACL using the correct bucket
      const url = config.acl === 'public-read'
        ? this.getPublicUrlForBucket(key, config.bucket)
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
