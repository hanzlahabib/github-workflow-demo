/**
 * Video Optimization Service
 * 
 * Enterprise-grade video preprocessing and optimization service designed to solve
 * Remotion timeout issues by intelligently processing R2 videos before rendering.
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { FFmpegUtils, VideoMetadata, OptimizationResult } from '../utils/ffmpegUtils';
import { r2VideoCache } from './r2VideoCache';

export interface OptimizedVideo {
  /** Original video URL */
  originalUrl: string;
  /** Local path to original video */
  originalPath: string;
  /** Local path to optimized video */
  optimizedPath?: string;
  /** Local URL for serving optimized video */
  optimizedUrl?: string;
  /** Video metadata */
  metadata: VideoMetadata;
  /** Optimization result */
  optimizationResult?: OptimizationResult;
  /** Optimization status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  /** Error message if failed */
  error?: string;
  /** Processing started at */
  startedAt: Date;
  /** Processing completed at */
  completedAt?: Date;
  /** Whether to use fallback (gradient) instead */
  useFallback: boolean;
  /** Recommended version to use */
  recommendedVersion: 'original' | 'optimized' | 'fallback';
}

export interface OptimizationOptions {
  /** Force optimization even if not needed */
  forceOptimization?: boolean;
  /** Target size in MB (default: 10) */
  targetSizeMB?: number;
  /** Max width (default: 1280) */
  maxWidth?: number;
  /** Max height (default: 720) */
  maxHeight?: number;
  /** Skip optimization for small files */
  skipSmallFiles?: boolean;
  /** Timeout for optimization in ms (default: 300000) */
  timeoutMs?: number;
  /** Create multiple quality versions */
  createMultipleVersions?: boolean;
}

export interface OptimizationStats {
  /** Total videos processed */
  totalProcessed: number;
  /** Videos optimized successfully */
  successfulOptimizations: number;
  /** Videos that failed optimization */
  failedOptimizations: number;
  /** Videos skipped (already optimal) */
  skippedOptimizations: number;
  /** Videos using fallback */
  fallbackVideos: number;
  /** Total bytes saved */
  totalBytesSaved: number;
  /** Average compression ratio */
  averageCompressionRatio: number;
  /** Average processing time */
  averageProcessingTime: number;
}

export class VideoOptimizationService extends EventEmitter {
  private optimizedVideos: Map<string, OptimizedVideo> = new Map();
  private activeOptimizations: Map<string, Promise<OptimizedVideo>> = new Map();
  private stats: OptimizationStats = {
    totalProcessed: 0,
    successfulOptimizations: 0,
    failedOptimizations: 0,
    skippedOptimizations: 0,
    fallbackVideos: 0,
    totalBytesSaved: 0,
    averageCompressionRatio: 1,
    averageProcessingTime: 0
  };
  
  private readonly cacheDirectory: string;
  private readonly optimizedDirectory: string;
  private readonly proxyPort: number;
  
  constructor(cacheDirectory?: string, proxyPort: number = 3001) {
    super();
    this.cacheDirectory = cacheDirectory || path.join(process.cwd(), 'temp', 'video-cache');
    this.optimizedDirectory = path.join(this.cacheDirectory, 'optimized');
    this.proxyPort = proxyPort;
    
    this.initialize();
  }
  
  /**
   * Initialize the optimization service
   */
  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.optimizedDirectory, { recursive: true });
      console.log('[VideoOptimization] Service initialized');
    } catch (error) {
      console.error('[VideoOptimization] Failed to initialize:', error);
    }
  }
  
  /**
   * Optimize a video with intelligent processing decisions
   */
  async optimizeVideo(
    videoUrl: string,
    videoPath: string,
    options: OptimizationOptions = {}
  ): Promise<OptimizedVideo> {
    const cacheKey = this.generateCacheKey(videoUrl);
    
    // Check if already optimized
    const existing = this.optimizedVideos.get(cacheKey);
    if (existing && existing.status === 'completed') {
      console.log(`[VideoOptimization] Using cached optimization for ${videoUrl.substring(0, 50)}...`);
      return existing;
    }
    
    // Check if optimization is in progress
    if (this.activeOptimizations.has(cacheKey)) {
      console.log(`[VideoOptimization] Waiting for active optimization of ${videoUrl.substring(0, 50)}...`);
      return await this.activeOptimizations.get(cacheKey)!;
    }
    
    // Start new optimization
    const optimizationPromise = this.performOptimization(videoUrl, videoPath, options);
    this.activeOptimizations.set(cacheKey, optimizationPromise);
    
    try {
      const result = await optimizationPromise;
      return result;
    } finally {
      this.activeOptimizations.delete(cacheKey);
    }
  }
  
  /**
   * Perform the actual video optimization
   */
  private async performOptimization(
    videoUrl: string,
    videoPath: string,
    options: OptimizationOptions
  ): Promise<OptimizedVideo> {
    const cacheKey = this.generateCacheKey(videoUrl);
    const startTime = Date.now();
    
    // Initialize optimization record
    const optimization: OptimizedVideo = {
      originalUrl: videoUrl,
      originalPath: videoPath,
      metadata: {} as VideoMetadata,
      status: 'processing',
      startedAt: new Date(),
      useFallback: false,
      recommendedVersion: 'original'
    };
    
    this.optimizedVideos.set(cacheKey, optimization);
    this.emit('optimization_started', { videoUrl, optimization });
    
    try {
      console.log(`[VideoOptimization] Starting optimization for ${videoUrl.substring(0, 50)}...`);
      
      // Extract metadata first
      optimization.metadata = await FFmpegUtils.extractMetadata(videoPath);
      
      // Determine optimization strategy
      const strategy = FFmpegUtils.shouldOptimizeVideo(
        optimization.metadata,
        options.targetSizeMB || 10
      );
      
      console.log(`[VideoOptimization] Strategy analysis:`, {
        fileSize: `${(optimization.metadata.fileSize / 1024 / 1024).toFixed(2)}MB`,
        resolution: `${optimization.metadata.width}x${optimization.metadata.height}`,
        shouldOptimize: strategy.shouldOptimize,
        reason: strategy.reason,
        action: strategy.recommendedAction
      });
      
      // Handle different strategies
      if (strategy.recommendedAction === 'fallback') {
        // File too large - use fallback
        optimization.status = 'completed';
        optimization.useFallback = true;
        optimization.recommendedVersion = 'fallback';
        optimization.completedAt = new Date();
        
        this.stats.totalProcessed++;
        this.stats.fallbackVideos++;
        
        console.log(`[VideoOptimization] Using fallback for ${videoUrl.substring(0, 50)}... (${strategy.reason})`);
        this.emit('optimization_fallback', { videoUrl, optimization, reason: strategy.reason });
        
        return optimization;
      }
      
      if (!strategy.shouldOptimize && !options.forceOptimization) {
        // Video already optimal
        optimization.status = 'skipped';
        optimization.recommendedVersion = 'original';
        optimization.completedAt = new Date();
        
        this.stats.totalProcessed++;
        this.stats.skippedOptimizations++;
        
        console.log(`[VideoOptimization] Skipping optimization: ${strategy.reason}`);
        this.emit('optimization_skipped', { videoUrl, optimization, reason: strategy.reason });
        
        return optimization;
      }
      
      // Perform optimization
      const outputPath = path.join(
        this.optimizedDirectory,
        `${cacheKey}_optimized.mp4`
      );
      
      const optimizationSettings = {
        targetSizeMB: options.targetSizeMB || 10,
        maxWidth: options.maxWidth || 1280,
        maxHeight: options.maxHeight || 720,
        crf: 23,
        preset: 'medium' as const,
        preserveAspectRatio: true,
        removeAudio: false,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        audioBitrate: 128
      };
      
      // Apply timeout if specified
      const timeoutPromise = options.timeoutMs ? 
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Optimization timeout')), options.timeoutMs)
        ) : null;
      
      const optimizationPromise = FFmpegUtils.optimizeVideo(
        videoPath,
        outputPath,
        optimizationSettings
      );
      
      optimization.optimizationResult = timeoutPromise ?
        await Promise.race([optimizationPromise, timeoutPromise]) :
        await optimizationPromise;
      
      if (optimization.optimizationResult.success) {
        optimization.optimizedPath = outputPath;
        optimization.optimizedUrl = `http://localhost:${this.proxyPort}/video/optimized/${path.basename(outputPath)}`;
        optimization.status = 'completed';
        optimization.recommendedVersion = 'optimized';
        optimization.completedAt = new Date();
        
        // Update stats
        this.stats.totalProcessed++;
        this.stats.successfulOptimizations++;
        this.stats.totalBytesSaved += optimization.optimizationResult.originalSize - optimization.optimizationResult.optimizedSize;
        
        // Update averages
        this.updateAverageStats(optimization);
        
        console.log(`[VideoOptimization] Optimization completed successfully:`, {
          originalSize: `${(optimization.optimizationResult.originalSize / 1024 / 1024).toFixed(2)}MB`,
          optimizedSize: `${(optimization.optimizationResult.optimizedSize / 1024 / 1024).toFixed(2)}MB`,
          compressionRatio: `${optimization.optimizationResult.compressionRatio.toFixed(2)}x`,
          processingTime: `${(optimization.optimizationResult.processingTime / 1000).toFixed(1)}s`
        });
        
        this.emit('optimization_completed', { videoUrl, optimization });
      } else {
        throw new Error(optimization.optimizationResult.error || 'Optimization failed');
      }
      
    } catch (error) {
      console.error(`[VideoOptimization] Optimization failed for ${videoUrl.substring(0, 50)}...`, error);
      
      optimization.status = 'failed';
      optimization.error = error instanceof Error ? error.message : String(error);
      optimization.useFallback = true;
      optimization.recommendedVersion = 'fallback';
      optimization.completedAt = new Date();
      
      this.stats.totalProcessed++;
      this.stats.failedOptimizations++;
      
      this.emit('optimization_failed', { videoUrl, optimization, error });
      
      // Clean up partial files
      if (optimization.optimizedPath) {
        try {
          await fs.unlink(optimization.optimizedPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
    
    return optimization;
  }
  
  /**
   * Get optimization status for a video
   */
  getOptimizationStatus(videoUrl: string): OptimizedVideo | undefined {
    const cacheKey = this.generateCacheKey(videoUrl);
    return this.optimizedVideos.get(cacheKey);
  }
  
  /**
   * Get the best available version of a video for Remotion
   */
  getBestVideoVersion(videoUrl: string): {
    url: string;
    isOptimized: boolean;
    useFallback: boolean;
    metadata?: VideoMetadata;
  } {
    const optimization = this.getOptimizationStatus(videoUrl);
    
    if (!optimization) {
      return {
        url: videoUrl,
        isOptimized: false,
        useFallback: false
      };
    }
    
    switch (optimization.recommendedVersion) {
      case 'optimized':
        return {
          url: optimization.optimizedUrl || videoUrl,
          isOptimized: true,
          useFallback: false,
          metadata: optimization.optimizationResult?.optimizedMetadata || optimization.metadata
        };
      
      case 'fallback':
        return {
          url: videoUrl,
          isOptimized: false,
          useFallback: true,
          metadata: optimization.metadata
        };
      
      default:
        return {
          url: videoUrl,
          isOptimized: false,
          useFallback: false,
          metadata: optimization.metadata
        };
    }
  }
  
  /**
   * Pre-process video for Remotion with intelligent decision making
   */
  async preprocessForRemotion(videoUrl: string): Promise<{
    videoUrl: string;
    durationInFrames: number;
    shouldSkipLoading: boolean;
    useFallback: boolean;
    metadata: VideoMetadata;
  }> {
    try {
      // First, try to get or download the video
      const cacheEntry = await r2VideoCache.getVideo(videoUrl, { 
        tags: ['remotion-preprocessing'] 
      });
      
      if (cacheEntry.status !== 'ready') {
        throw new Error('Video not available in cache');
      }
      
      // Optimize the video
      const optimization = await this.optimizeVideo(videoUrl, cacheEntry.localPath, {
        targetSizeMB: 10,
        timeoutMs: 120000 // 2 minute timeout for optimization
      });
      
      const bestVersion = this.getBestVideoVersion(videoUrl);
      
      // Calculate duration in frames (assume 30fps for Remotion)
      const fps = 30;
      const durationInFrames = Math.round(optimization.metadata.duration * fps);
      
      console.log(`[VideoOptimization] Preprocessed for Remotion:`, {
        originalUrl: videoUrl.substring(0, 50) + '...',
        finalUrl: bestVersion.url.substring(0, 50) + '...',
        isOptimized: bestVersion.isOptimized,
        useFallback: bestVersion.useFallback,
        durationInFrames,
        fileSize: `${(optimization.metadata.fileSize / 1024 / 1024).toFixed(2)}MB`
      });
      
      return {
        videoUrl: bestVersion.url,
        durationInFrames,
        shouldSkipLoading: bestVersion.useFallback,
        useFallback: bestVersion.useFallback,
        metadata: optimization.metadata
      };
      
    } catch (error) {
      console.error(`[VideoOptimization] Preprocessing failed for ${videoUrl.substring(0, 50)}...`, error);
      
      // Return fallback configuration
      return {
        videoUrl: videoUrl,
        durationInFrames: 30 * 30, // 30 seconds default
        shouldSkipLoading: true,
        useFallback: true,
        metadata: {} as VideoMetadata
      };
    }
  }
  
  /**
   * Get optimization statistics
   */
  getStats(): OptimizationStats {
    return { ...this.stats };
  }
  
  /**
   * Clear optimization cache
   */
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.optimizedDirectory);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.optimizedDirectory, file)))
      );
      
      this.optimizedVideos.clear();
      this.resetStats();
      
      console.log('[VideoOptimization] Cache cleared successfully');
    } catch (error) {
      console.error('[VideoOptimization] Failed to clear cache:', error);
    }
  }
  
  /**
   * Generate cache key from URL
   */
  private generateCacheKey(url: string): string {
    return require('crypto').createHash('sha256').update(url).digest('hex').substring(0, 16);
  }
  
  /**
   * Update average statistics
   */
  private updateAverageStats(optimization: OptimizedVideo): void {
    if (!optimization.optimizationResult) return;
    
    const totalSuccessful = this.stats.successfulOptimizations;
    const newRatio = optimization.optimizationResult.compressionRatio;
    const newProcessingTime = optimization.optimizationResult.processingTime;
    
    // Update running averages
    this.stats.averageCompressionRatio = 
      (this.stats.averageCompressionRatio * (totalSuccessful - 1) + newRatio) / totalSuccessful;
    
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (totalSuccessful - 1) + newProcessingTime) / totalSuccessful;
  }
  
  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      successfulOptimizations: 0,
      failedOptimizations: 0,
      skippedOptimizations: 0,
      fallbackVideos: 0,
      totalBytesSaved: 0,
      averageCompressionRatio: 1,
      averageProcessingTime: 0
    };
  }
}

// Export singleton instance
export const videoOptimizationService = new VideoOptimizationService();