import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  endpoint?: string; // For custom S3-compatible services
  forcePathStyle?: boolean;
  signatureVersion?: string;
}

export interface UploadOptions {
  key?: string; // Custom key, if not provided will be auto-generated
  contentType?: string;
  metadata?: { [key: string]: string };
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
  serverSideEncryption?: 'AES256' | 'aws:kms';
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'GLACIER' | 'DEEP_ARCHIVE';
  expires?: Date;
}

export interface UploadResult {
  key: string;
  url: string;
  etag: string;
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
  private s3: AWS.S3;
  private bucketName: string;
  private region: string;

  constructor(config: S3Config) {
    this.bucketName = config.bucketName;
    this.region = config.region;

    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });

    this.s3 = new AWS.S3({
      endpoint: config.endpoint,
      s3ForcePathStyle: config.forcePathStyle || false,
      signatureVersion: config.signatureVersion || 'v4',
      httpOptions: {
        timeout: 120000, // 2 minutes
        connectTimeout: 60000, // 1 minute
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

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        ACL: options.acl || 'private',
        Metadata: options.metadata || {},
      };

      if (options.serverSideEncryption) {
        uploadParams.ServerSideEncryption = options.serverSideEncryption;
      }

      if (options.storageClass) {
        uploadParams.StorageClass = options.storageClass;
      }

      if (options.expires) {
        uploadParams.Expires = options.expires;
      }

      const result = await this.s3.upload(uploadParams).promise();

      console.log(`[S3] File uploaded successfully: ${key}`);
      
      return {
        key,
        url: result.Location,
        etag: result.ETag,
        location: result.Location,
        bucket: result.Bucket!,
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

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: options.acl || 'private',
        Metadata: options.metadata || {},
      };

      if (options.serverSideEncryption) {
        uploadParams.ServerSideEncryption = options.serverSideEncryption;
      }

      if (options.storageClass) {
        uploadParams.StorageClass = options.storageClass;
      }

      const result = await this.s3.upload(uploadParams).promise();

      console.log(`[S3] Buffer uploaded successfully: ${key}`);
      
      return {
        key,
        url: result.Location,
        etag: result.ETag,
        location: result.Location,
        bucket: result.Bucket!,
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
      
      const downloadParams: AWS.S3.GetObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        ...options,
      };

      const result = await this.s3.getObject(downloadParams).promise();
      
      if (!result.Body) {
        throw new Error('No data received from S3');
      }

      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(localPath, result.Body as Buffer);
      
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
      
      const downloadParams: AWS.S3.GetObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        ...options,
      };

      const result = await this.s3.getObject(downloadParams).promise();
      
      if (!result.Body) {
        throw new Error('No data received from S3');
      }

      console.log(`[S3] Buffer downloaded successfully: ${key}`);
      return result.Body as Buffer;
    } catch (error) {
      console.error('[S3] Buffer download failed:', error);
      throw new Error(`Buffer download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      console.log(`[S3] Deleting file: ${key}`);
      
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();

      console.log(`[S3] File deleted successfully: ${key}`);
    } catch (error) {
      console.error('[S3] File deletion failed:', error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    try {
      console.log(`[S3] Deleting ${keys.length} files`);
      
      const deleteParams: AWS.S3.DeleteObjectsRequest = {
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false,
        },
      };

      const result = await this.s3.deleteObjects(deleteParams).promise();
      
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
      
      const listParams: AWS.S3.ListObjectsRequest = {
        Bucket: this.bucketName,
        ...options,
      };

      const result = await this.s3.listObjects(listParams).promise();
      
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

      const url = this.s3.getSignedUrl(operation, params);
      
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
      
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: options.expires || 3600,
        Conditions: options.conditions || [],
        Fields: options.fields || {},
      };

      return new Promise((resolve, reject) => {
        this.s3.createPresignedPost(params, (err, data) => {
          if (err) {
            reject(err);
          } else {
            console.log(`[S3] Presigned POST generated successfully`);
            resolve(data);
          }
        });
      });
    } catch (error) {
      console.error('[S3] Presigned POST generation failed:', error);
      throw new Error(`Presigned POST generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async copyObject(sourceKey: string, destinationKey: string, sourceBucket?: string): Promise<void> {
    try {
      console.log(`[S3] Copying object from ${sourceKey} to ${destinationKey}`);
      
      const copySource = sourceBucket ? `${sourceBucket}/${sourceKey}` : `${this.bucketName}/${sourceKey}`;
      
      await this.s3.copyObject({
        Bucket: this.bucketName,
        CopySource: copySource,
        Key: destinationKey,
      }).promise();

      console.log(`[S3] Object copied successfully`);
    } catch (error) {
      console.error('[S3] Object copy failed:', error);
      throw new Error(`Object copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async headObject(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      console.log(`[S3] Getting object metadata: ${key}`);
      
      const result = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();

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
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
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