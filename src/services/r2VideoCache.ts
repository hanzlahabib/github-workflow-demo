/**
 * R2 Video Cache Service
 * 
 * Core service for downloading and caching R2 videos to local storage
 * to solve Node.js networking issues during Remotion rendering.
 */

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';

import type {
  CacheEntry,
  CacheConfig,
  CacheStats,
  DownloadProgress,
  CacheOperation,
  CacheCleanupResult,
  PreCacheRequest,
  CacheSearchOptions,
  CacheHealthCheck,
  VideoMetadata
} from '../types/videoCache';

import {
  DownloadError,
  StorageError
} from '../types/videoCache';

import { videoOptimizationService } from './videoOptimizationService';

const execAsync = promisify(exec);

export class R2VideoCacheService extends EventEmitter {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private activeDownloads: Map<string, CacheOperation> = new Map();
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(config?: Partial<CacheConfig>) {
    super();
    
    this.config = {
      maxSizeBytes: 10 * 1024 * 1024 * 1024, // 10GB
      maxEntries: 1000,
      defaultTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      cacheDirectory: path.join(process.cwd(), 'temp', 'video-cache'),
      proxyPort: 3001,
      enableBackgroundCleanup: true,
      cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
      enablePreCaching: true,
      maxConcurrentDownloads: 3,
      downloadTimeoutMs: 5 * 60 * 1000, // 5 minutes
      maxRetryAttempts: 3,
      enableVideoOptimization: true, // Enable automatic video optimization
      optimizationTargetSizeMB: 10, // Target size for optimization
      autoOptimizeThresholdMB: 20, // Auto-optimize videos larger than this
      ...config
    };

    this.stats = {
      currentSizeBytes: 0,
      entryCount: 0,
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      avgDownloadTimeMs: 0,
      cacheDirectory: this.config.cacheDirectory,
      availableDiskSpaceBytes: 0
    };
  }

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[R2Cache] Cache service already initialized, skipping...');
      return;
    }

    console.log('[R2Cache] Initializing video cache service...');

    try {
      // Create cache directory if it doesn't exist
      await fs.mkdir(this.config.cacheDirectory, { recursive: true });

      // Load existing cache entries
      await this.loadExistingCache();

      // Start background cleanup if enabled (only once)
      if (this.config.enableBackgroundCleanup && !this.cleanupTimer) {
        this.startBackgroundCleanup();
      }

      // Update disk space info
      await this.updateDiskSpaceInfo();

      this.initialized = true;
      console.log(`[R2Cache] Cache service initialized with ${this.cache.size} existing entries`);
      
      this.emit('initialized', this.stats);
    } catch (error) {
      console.error('[R2Cache] Failed to initialize cache service:', error);
      throw new StorageError('Failed to initialize cache service', error as Error);
    }
  }

  /**
   * Get or download a video from cache
   */
  async getVideo(url: string, options?: { tags?: string[]; priority?: 'low' | 'medium' | 'high' }): Promise<CacheEntry> {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = this.generateCacheKey(url);
    const existingEntry = this.cache.get(cacheKey);

    // Check if we have a valid cached entry
    if (existingEntry && this.isEntryValid(existingEntry)) {
      // Update access information
      existingEntry.lastAccessedAt = new Date();
      existingEntry.accessCount++;
      this.stats.totalHits++;
      this.updateHitRate();

      console.log(`[R2Cache] Cache HIT for ${url.substring(0, 50)}...`);
      this.emit('cache_hit', { url, entry: existingEntry });
      
      return existingEntry;
    }

    // Cache miss - need to download
    this.stats.totalMisses++;
    this.updateHitRate();
    
    console.log(`[R2Cache] Cache MISS for ${url.substring(0, 50)}...`);
    this.emit('cache_miss', { url });

    // Check if already downloading
    if (this.activeDownloads.has(url)) {
      console.log(`[R2Cache] Download already in progress for ${url.substring(0, 50)}...`);
      return this.waitForDownload(url);
    }

    // Start download
    return this.downloadAndCache(url, options);
  }

  /**
   * Download and cache a video
   */
  private async downloadAndCache(url: string, options?: { tags?: string[]; priority?: 'low' | 'medium' | 'high' }): Promise<CacheEntry> {
    const cacheKey = this.generateCacheKey(url);
    const fileName = `${cacheKey}.${this.getFileExtension(url)}`;
    const localPath = path.join(this.config.cacheDirectory, fileName);
    const localUrl = `http://localhost:${this.config.proxyPort}/video/${fileName}`;

    // Create download operation
    const operation: CacheOperation = {
      type: 'download',
      url,
      status: 'pending',
      startedAt: new Date()
    };

    this.activeDownloads.set(url, operation);
    
    // Create initial cache entry
    const entry: CacheEntry = {
      id: cacheKey,
      originalUrl: url,
      localPath,
      localUrl,
      fileSizeBytes: 0,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 1,
      contentType: 'video/mp4', // Will be updated after download
      status: 'downloading',
      ttlMs: this.config.defaultTtlMs,
      tags: options?.tags || ['r2-video']
    };

    this.cache.set(cacheKey, entry);

    try {
      console.log(`[R2Cache] Starting download: ${url.substring(0, 50)}...`);
      operation.status = 'in_progress';
      
      this.emit('download_started', { url, entry });

      // Check concurrent download limit
      const activeDownloadCount = Array.from(this.activeDownloads.values())
        .filter(op => op.status === 'in_progress').length;

      if (activeDownloadCount > this.config.maxConcurrentDownloads) {
        throw new DownloadError('Too many concurrent downloads', url);
      }

      // Perform the download with timeout and retry logic
      const downloadResult = await this.performDownload(url, localPath, operation);
      
      // Update entry with download results
      entry.fileSizeBytes = downloadResult.fileSizeBytes;
      entry.contentType = downloadResult.contentType;
      entry.metadata = downloadResult.metadata;
      entry.status = 'ready';

      // Update cache stats
      this.stats.currentSizeBytes += entry.fileSizeBytes;
      this.stats.entryCount = this.cache.size;

      operation.status = 'completed';
      operation.completedAt = new Date();

      console.log(`[R2Cache] Download completed: ${url.substring(0, 50)}... (${this.formatBytes(entry.fileSizeBytes)})`);
      
      this.emit('download_completed', { url, entry, operation });

      // ✅ VIDEO OPTIMIZATION: Automatically optimize large videos after download
      if (this.config.enableVideoOptimization && entry.metadata) {
        const fileSizeMB = entry.fileSizeBytes / 1024 / 1024;
        const shouldOptimize = fileSizeMB > (this.config.autoOptimizeThresholdMB || 20);
        
        if (shouldOptimize) {
          console.log(`[R2Cache] Triggering automatic optimization for ${url.substring(0, 50)}... (${this.formatBytes(entry.fileSizeBytes)})`);
          
          // Optimize in background without blocking the cache return
          videoOptimizationService.optimizeVideo(url, entry.localPath, {
            targetSizeMB: this.config.optimizationTargetSizeMB || 10,
            maxWidth: 1280,
            maxHeight: 720,
            timeoutMs: 180000 // 3 minute timeout for background optimization
          }).then(optimization => {
            console.log(`[R2Cache] Background optimization completed for ${url.substring(0, 50)}...`, {
              status: optimization.status,
              recommended: optimization.recommendedVersion,
              useFallback: optimization.useFallback
            });
            
            // Update cache entry with optimization info
            entry.metadata = {
              ...entry.metadata,
              optimizationStatus: 'completed' as const,
              optimizationCompleted: true
            };
            
            this.emit('video_optimized', { url, entry, optimization });
          }).catch(error => {
            console.warn(`[R2Cache] Background optimization failed for ${url.substring(0, 50)}...`, error);
            
            // Mark as optimization failed but don't block usage
            if (entry.metadata) {
              entry.metadata.optimizationStatus = 'failed';
              entry.metadata.optimizationCompleted = true;
            }
          });
        }
      }

      // Check if we need to cleanup due to size limits
      await this.enforceStorageLimits();

      return entry;

    } catch (error) {
      console.error(`[R2Cache] Download failed for ${url.substring(0, 50)}...`, error);
      
      // Update entry status
      entry.status = 'error';
      entry.errorMessage = error instanceof Error ? error.message : String(error);

      operation.status = 'failed';
      operation.error = entry.errorMessage;
      operation.completedAt = new Date();

      this.emit('download_failed', { url, entry, error });

      throw new DownloadError(`Failed to download video: ${entry.errorMessage}`, url, error as Error);
    } finally {
      this.activeDownloads.delete(url);
    }
  }

  /**
   * Perform the actual download with retry logic
   */
  private async performDownload(url: string, localPath: string, operation: CacheOperation): Promise<{
    fileSizeBytes: number;
    contentType: string;
    metadata?: VideoMetadata;
  }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        console.log(`[R2Cache] Download attempt ${attempt}/${this.config.maxRetryAttempts} for ${url.substring(0, 50)}...`);
        
        const result = await this.downloadWithProgress(url, localPath, operation);
        
        // Validate the downloaded file
        const stats = await fs.stat(localPath);
        if (stats.size === 0) {
          throw new Error('Downloaded file is empty');
        }

        console.log(`[R2Cache] Download successful on attempt ${attempt}`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`[R2Cache] Download attempt ${attempt} failed:`, error);
        
        // Clean up partial file
        try {
          await fs.unlink(localPath);
        } catch {
          // Ignore cleanup errors
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetryAttempts) {
          const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          console.log(`[R2Cache] Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Download failed after all retry attempts');
  }

  /**
   * Download with progress tracking
   */
  private async downloadWithProgress(url: string, localPath: string, operation: CacheOperation): Promise<{
    fileSizeBytes: number;
    contentType: string;
    metadata?: VideoMetadata;
  }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Download timeout'));
      }, this.config.downloadTimeoutMs);

      // Use fetch for downloading with progress tracking
      fetch(url)
        .then(async response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type') || 'video/mp4';
          const contentLength = parseInt(response.headers.get('content-length') || '0');

          const writeStream = createWriteStream(localPath);
          let downloadedBytes = 0;
          const startTime = Date.now();

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Unable to get response reader');
          }

          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  writeStream.end();
                  break;
                }

                downloadedBytes += value.length;
                writeStream.write(value);

                // Update progress
                if (contentLength > 0) {
                  const progressPercent = (downloadedBytes / contentLength) * 100;
                  const elapsedTime = Date.now() - startTime;
                  const speedBytesPerSecond = downloadedBytes / (elapsedTime / 1000);
                  const estimatedTimeRemainingMs = ((contentLength - downloadedBytes) / speedBytesPerSecond) * 1000;

                  operation.progress = {
                    downloadedBytes,
                    totalBytes: contentLength,
                    progressPercent,
                    speedBytesPerSecond,
                    estimatedTimeRemainingMs
                  };

                  this.emit('download_progress', { url, progress: operation.progress });
                }
              }

              // Get final file stats
              const stats = await fs.stat(localPath);
              
              clearTimeout(timeout);
              resolve({
                fileSizeBytes: stats.size,
                contentType,
                metadata: await this.extractVideoMetadata(localPath)
              });

            } catch (error) {
              writeStream.destroy();
              clearTimeout(timeout);
              reject(error);
            }
          };

          pump();
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Extract video metadata using ffprobe if available
   */
  private async extractVideoMetadata(filePath: string): Promise<VideoMetadata | undefined> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      
      const metadata = JSON.parse(stdout);
      const videoStream = metadata.streams?.find((stream: any) => stream.codec_type === 'video');
      
      if (videoStream) {
        return {
          duration: parseFloat(metadata.format?.duration || '0'),
          width: videoStream.width,
          height: videoStream.height,
          bitrate: parseInt(videoStream.bit_rate || '0'),
          fps: eval(videoStream.r_frame_rate || '30'), // e.g., "30/1" -> 30
          codec: videoStream.codec_name
        };
      }
    } catch (error) {
      console.warn('[R2Cache] Failed to extract video metadata:', error);
    }
    
    return undefined;
  }

  /**
   * Wait for an active download to complete
   */
  private async waitForDownload(url: string): Promise<CacheEntry> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const operation = this.activeDownloads.get(url);
        
        if (!operation) {
          // Download completed, get from cache
          const cacheKey = this.generateCacheKey(url);
          const entry = this.cache.get(cacheKey);
          
          if (entry && entry.status === 'ready') {
            clearInterval(checkInterval);
            resolve(entry);
          } else if (entry && entry.status === 'error') {
            clearInterval(checkInterval);
            reject(new DownloadError(entry.errorMessage || 'Download failed', url));
          }
        } else if (operation.status === 'failed') {
          clearInterval(checkInterval);
          reject(new DownloadError(operation.error || 'Download failed', url));
        }
      }, 1000); // Check every second

      // Timeout after reasonable time
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new DownloadError('Timeout waiting for download', url));
      }, this.config.downloadTimeoutMs + 30000); // Download timeout + 30s buffer
    });
  }

  /**
   * Generate cache key from URL
   */
  private generateCacheKey(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
  }

  /**
   * Get file extension from URL
   */
  private getFileExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const extension = path.extname(urlPath).toLowerCase();
    
    // Default to mp4 if no extension found
    return extension.startsWith('.') ? extension.substring(1) : 'mp4';
  }

  /**
   * Check if cache entry is valid
   */
  private isEntryValid(entry: CacheEntry): boolean {
    if (entry.status !== 'ready') {
      return false;
    }

    // Check TTL
    const now = Date.now();
    const expiresAt = entry.createdAt.getTime() + entry.ttlMs;
    
    if (now > expiresAt) {
      console.log(`[R2Cache] Entry expired: ${entry.originalUrl.substring(0, 50)}...`);
      return false;
    }

    return true;
  }

  /**
   * Load existing cache entries from disk
   */
  private async loadExistingCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.cacheDirectory);
      const videoFiles = files.filter(file => 
        file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov')
      );

      console.log(`[R2Cache] Found ${videoFiles.length} existing cached videos`);

      for (const file of videoFiles) {
        const filePath = path.join(this.config.cacheDirectory, file);
        const stats = await fs.stat(filePath);
        
        // Generate cache entry for existing file
        // Note: We can't recover the original URL, so these will be orphaned until accessed
        const cacheKey = path.parse(file).name;
        const localUrl = `http://localhost:${this.config.proxyPort}/video/${file}`;

        const entry: CacheEntry = {
          id: cacheKey,
          originalUrl: 'unknown', // Will be updated when accessed
          localPath: filePath,
          localUrl,
          fileSizeBytes: stats.size,
          createdAt: stats.birthtime || stats.ctime,
          lastAccessedAt: stats.atime || stats.mtime,
          accessCount: 0,
          contentType: 'video/mp4',
          status: 'ready',
          ttlMs: this.config.defaultTtlMs,
          tags: ['existing', 'r2-video']
        };

        this.cache.set(cacheKey, entry);
        this.stats.currentSizeBytes += entry.fileSizeBytes;
      }

      this.stats.entryCount = this.cache.size;
    } catch (error) {
      console.warn('[R2Cache] Failed to load existing cache:', error);
    }
  }

  /**
   * Start background cleanup process
   */
  private startBackgroundCleanup(): void {
    // Prevent multiple cleanup timers
    if (this.cleanupTimer) {
      console.log('[R2Cache] Background cleanup already running, skipping initialization');
      return;
    }

    console.log(`[R2Cache] Starting background cleanup process (interval: ${this.config.cleanupIntervalMs}ms = ${this.config.cleanupIntervalMs / (60 * 60 * 1000)} hours)`);
    
    this.cleanupTimer = setInterval(async () => {
      try {
        console.log('[R2Cache] Running background cleanup...');
        const result = await this.cleanup('lru');
        
        if (result.removedEntries > 0) {
          console.log(`[R2Cache] Background cleanup removed ${result.removedEntries} entries, freed ${this.formatBytes(result.bytesFreed)}`);
        } else {
          console.log('[R2Cache] Background cleanup completed - no entries removed');
        }
        
        this.stats.lastCleanupAt = new Date();
      } catch (error) {
        console.error('[R2Cache] Background cleanup failed:', error);
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Cleanup cache entries based on strategy
   */
  async cleanup(strategy: 'lru' | 'size_limit' | 'ttl_expired' | 'manual' = 'lru'): Promise<CacheCleanupResult> {
    const startTime = Date.now();
    let removedEntries = 0;
    let bytesFreed = 0;
    const errors: string[] = [];

    console.log(`[R2Cache] Starting cleanup with strategy: ${strategy}`);

    try {
      const entries = Array.from(this.cache.values());

      let entriesToRemove: CacheEntry[] = [];

      switch (strategy) {
        case 'ttl_expired':
          entriesToRemove = entries.filter(entry => !this.isEntryValid(entry));
          break;

        case 'size_limit':
          if (this.stats.currentSizeBytes > this.config.maxSizeBytes) {
            // Sort by last accessed (LRU) and remove oldest until under limit
            const sortedEntries = entries.sort((a, b) => 
              a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
            );
            
            let currentSize = this.stats.currentSizeBytes;
            for (const entry of sortedEntries) {
              if (currentSize <= this.config.maxSizeBytes * 0.8) break; // Leave 20% buffer
              entriesToRemove.push(entry);
              currentSize -= entry.fileSizeBytes;
            }
          }
          break;

        case 'lru':
          // Remove entries if we exceed max entries or size
          if (this.cache.size > this.config.maxEntries || this.stats.currentSizeBytes > this.config.maxSizeBytes) {
            const sortedEntries = entries.sort((a, b) => 
              a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
            );
            
            const targetEntries = Math.max(this.config.maxEntries * 0.8, 1); // Leave 20% buffer
            const targetSize = this.config.maxSizeBytes * 0.8;
            
            let currentEntries = this.cache.size;
            let currentSize = this.stats.currentSizeBytes;
            
            for (const entry of sortedEntries) {
              if (currentEntries <= targetEntries && currentSize <= targetSize) break;
              entriesToRemove.push(entry);
              currentEntries--;
              currentSize -= entry.fileSizeBytes;
            }
          }
          break;

        case 'manual':
          entriesToRemove = entries;
          break;
      }

      // Remove selected entries
      for (const entry of entriesToRemove) {
        try {
          await this.removeEntry(entry);
          removedEntries++;
          bytesFreed += entry.fileSizeBytes;
        } catch (error) {
          const errorMsg = `Failed to remove ${entry.id}: ${error}`;
          errors.push(errorMsg);
          console.error(`[R2Cache] ${errorMsg}`);
        }
      }

      // Update stats
      this.stats.entryCount = this.cache.size;
      this.stats.currentSizeBytes -= bytesFreed;
      
      await this.updateDiskSpaceInfo();

    } catch (error) {
      errors.push(`Cleanup failed: ${error}`);
      console.error('[R2Cache] Cleanup failed:', error);
    }

    const result: CacheCleanupResult = {
      removedEntries,
      bytesFreed,
      cleanupDurationMs: Date.now() - startTime,
      strategy,
      errors
    };

    console.log(`[R2Cache] Cleanup completed: ${JSON.stringify(result)}`);
    this.emit('cleanup_completed', result);

    return result;
  }

  /**
   * Remove a specific cache entry
   */
  private async removeEntry(entry: CacheEntry): Promise<void> {
    try {
      // Delete file from disk
      await fs.unlink(entry.localPath);
    } catch (error) {
      // File might not exist, continue with cache removal
      console.warn(`[R2Cache] Failed to delete file ${entry.localPath}:`, error);
    }

    // Remove from cache
    this.cache.delete(entry.id);
    
    console.log(`[R2Cache] Removed entry: ${entry.originalUrl.substring(0, 50)}... (${this.formatBytes(entry.fileSizeBytes)})`);
  }

  /**
   * Enforce storage limits by triggering cleanup if needed
   */
  private async enforceStorageLimits(): Promise<void> {
    if (this.stats.currentSizeBytes > this.config.maxSizeBytes || 
        this.cache.size > this.config.maxEntries) {
      console.log('[R2Cache] Storage limits exceeded, triggering cleanup...');
      await this.cleanup('size_limit');
    }
  }

  /**
   * Update disk space information
   */
  private async updateDiskSpaceInfo(): Promise<void> {
    try {
      const { stdout } = await execAsync(`df "${this.config.cacheDirectory}" | tail -1 | awk '{print $4}'`);
      this.stats.availableDiskSpaceBytes = parseInt(stdout.trim()) * 1024; // df reports in KB
    } catch (error) {
      console.warn('[R2Cache] Failed to get disk space info:', error);
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    if (total > 0) {
      this.stats.hitRate = this.stats.totalHits / total;
      this.stats.missRate = this.stats.totalMisses / total;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entry by URL
   */
  getCacheEntry(url: string): CacheEntry | undefined {
    const cacheKey = this.generateCacheKey(url);
    return this.cache.get(cacheKey);
  }

  /**
   * Check if URL is cached and valid
   */
  isCached(url: string): boolean {
    const entry = this.getCacheEntry(url);
    return entry ? this.isEntryValid(entry) : false;
  }

  /**
   * Get optimized video for Remotion usage with preprocessing
   */
  async getOptimizedVideoForRemotion(url: string): Promise<{
    videoUrl: string;
    localPath: string;
    durationInFrames: number;
    shouldSkipLoading: boolean;
    useFallback: boolean;
    metadata: VideoMetadata;
    isOptimized: boolean;
  }> {
    try {
      // First get the cached video
      const cacheEntry = await this.getVideo(url, { 
        tags: ['remotion-optimized'],
        priority: 'high'
      });

      if (cacheEntry.status !== 'ready') {
        throw new Error('Video not ready in cache');
      }

      // Use the optimization service to preprocess for Remotion
      const preprocessResult = await videoOptimizationService.preprocessForRemotion(url);
      
      // Get the best version info
      const bestVersion = videoOptimizationService.getBestVideoVersion(url);
      
      return {
        videoUrl: preprocessResult.useFallback ? cacheEntry.localUrl : (bestVersion.url || cacheEntry.localUrl),
        localPath: cacheEntry.localPath,
        durationInFrames: preprocessResult.durationInFrames,
        shouldSkipLoading: preprocessResult.shouldSkipLoading,
        useFallback: preprocessResult.useFallback,
        metadata: preprocessResult.metadata,
        isOptimized: bestVersion.isOptimized
      };
    } catch (error) {
      console.error(`[R2Cache] Failed to get optimized video for Remotion: ${url.substring(0, 50)}...`, error);
      
      // Return fallback configuration
      return {
        videoUrl: url,
        localPath: '',
        durationInFrames: 30 * 30, // 30 seconds default
        shouldSkipLoading: true,
        useFallback: true,
        metadata: {} as VideoMetadata,
        isOptimized: false
      };
    }
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Shutdown the cache service
   */
  async shutdown(): Promise<void> {
    console.log('[R2Cache] Shutting down cache service...');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Wait for active downloads to complete or timeout
    const activeDownloadUrls = Array.from(this.activeDownloads.keys());
    if (activeDownloadUrls.length > 0) {
      console.log(`[R2Cache] Waiting for ${activeDownloadUrls.length} active downloads to complete...`);
      
      // Wait up to 30 seconds for downloads to complete
      const timeout = setTimeout(() => {
        console.warn('[R2Cache] Forcing shutdown with active downloads');
      }, 30000);

      try {
        await Promise.allSettled(
          activeDownloadUrls.map(url => this.waitForDownload(url))
        );
      } catch (error) {
        console.warn('[R2Cache] Some downloads failed during shutdown:', error);
      }

      clearTimeout(timeout);
    }

    this.removeAllListeners();
    console.log('[R2Cache] Cache service shutdown complete');
  }
}

// Export singleton instance
export const r2VideoCache = new R2VideoCacheService();