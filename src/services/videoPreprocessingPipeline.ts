/**
 * Video Preprocessing Pipeline
 * 
 * Orchestrates the complete video preprocessing workflow for Remotion
 * to eliminate timeout issues and ensure optimal video playback.
 */

import { EventEmitter } from 'events';
import { r2VideoCache } from './r2VideoCache';
import { videoOptimizationService } from './videoOptimizationService';
import { FFmpegUtils } from '../utils/ffmpegUtils';

export interface PreprocessingRequest {
  /** Video URL to preprocess */
  videoUrl: string;
  /** Target configuration for Remotion */
  targetConfig: {
    maxSizeMB: number;
    maxWidth: number;
    maxHeight: number;
    targetFPS?: number;
  };
  /** Processing options */
  options: {
    forceOptimization?: boolean;
    timeoutMs?: number;
    priority?: 'low' | 'medium' | 'high';
    enableFallback?: boolean;
  };
}

export interface PreprocessingResult {
  /** Original video URL */
  originalUrl: string;
  /** Final video URL to use in Remotion */
  finalVideoUrl: string;
  /** Whether video is optimized */
  isOptimized: boolean;
  /** Whether to use fallback (gradient) */
  useFallback: boolean;
  /** Pre-calculated duration in frames */
  durationInFrames: number;
  /** Whether Remotion should skip loading */
  shouldSkipLoading: boolean;
  /** Video metadata */
  metadata: any;
  /** Processing stats */
  processingStats: {
    downloadTime: number;
    optimizationTime: number;
    totalTime: number;
    originalSize: number;
    finalSize: number;
    compressionRatio: number;
  };
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export interface PipelineStats {
  /** Total requests processed */
  totalRequests: number;
  /** Successful preprocessing */
  successfulProcessing: number;
  /** Failed preprocessing */
  failedProcessing: number;
  /** Videos using fallback */
  fallbackVideos: number;
  /** Average processing time */
  avgProcessingTime: number;
  /** Total data saved through optimization */
  totalDataSaved: number;
}

export class VideoPreprocessingPipeline extends EventEmitter {
  private stats: PipelineStats = {
    totalRequests: 0,
    successfulProcessing: 0,
    failedProcessing: 0,
    fallbackVideos: 0,
    avgProcessingTime: 0,
    totalDataSaved: 0
  };

  private activeRequests: Map<string, Promise<PreprocessingResult>> = new Map();
  
  constructor() {
    super();
    console.log('[VideoPreprocessing] Pipeline initialized');
  }

  /**
   * Preprocess video for optimal Remotion usage
   */
  async preprocessVideo(request: PreprocessingRequest): Promise<PreprocessingResult> {
    const { videoUrl, targetConfig, options } = request;
    const startTime = Date.now();
    
    // Check for active preprocessing
    const cacheKey = this.generateCacheKey(videoUrl);
    if (this.activeRequests.has(cacheKey)) {
      console.log(`[VideoPreprocessing] Using active preprocessing for ${videoUrl.substring(0, 50)}...`);
      return await this.activeRequests.get(cacheKey)!;
    }

    // Start preprocessing
    const processingPromise = this.performPreprocessing(request, startTime);
    this.activeRequests.set(cacheKey, processingPromise);

    try {
      const result = await processingPromise;
      this.updateStats(result);
      return result;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * Perform the complete preprocessing workflow
   */
  private async performPreprocessing(
    request: PreprocessingRequest,
    startTime: number
  ): Promise<PreprocessingResult> {
    const { videoUrl, targetConfig, options } = request;
    
    console.log(`[VideoPreprocessing] Starting preprocessing for ${videoUrl.substring(0, 50)}...`);
    
    this.emit('preprocessing_started', { videoUrl, targetConfig, options });
    
    try {
      this.stats.totalRequests++;
      
      // Step 1: Download and cache the video
      console.log(`[VideoPreprocessing] Step 1: Downloading and caching video...`);
      const downloadStartTime = Date.now();
      
      const cacheEntry = await r2VideoCache.getVideo(videoUrl, {
        tags: ['preprocessing'],
        priority: options.priority || 'medium'
      });
      
      const downloadTime = Date.now() - downloadStartTime;
      
      if (cacheEntry.status !== 'ready') {
        throw new Error(`Video caching failed: ${cacheEntry.errorMessage || 'Unknown error'}`);
      }
      
      console.log(`[VideoPreprocessing] Video cached successfully (${downloadTime}ms)`);
      
      // Step 2: Extract metadata quickly
      console.log(`[VideoPreprocessing] Step 2: Extracting video metadata...`);
      let metadata;
      
      try {
        // Try quick metadata extraction first
        metadata = await FFmpegUtils.extractQuickMetadata(cacheEntry.localPath);
      } catch {
        // Fallback to full metadata extraction
        metadata = await FFmpegUtils.extractMetadata(cacheEntry.localPath);
      }
      
      const fileSizeMB = metadata.fileSize / 1024 / 1024;
      console.log(`[VideoPreprocessing] Metadata extracted:`, {
        duration: `${metadata.duration}s`,
        resolution: `${metadata.width}x${metadata.height}`,
        size: `${fileSizeMB.toFixed(2)}MB`,
        bitrate: `${metadata.bitrate}kbps`
      });
      
      // Step 3: Determine processing strategy
      const strategy = this.determineProcessingStrategy(metadata, targetConfig, options);
      console.log(`[VideoPreprocessing] Processing strategy: ${strategy.action} (${strategy.reason})`);
      
      if (strategy.action === 'fallback') {
        const result: PreprocessingResult = {
          originalUrl: videoUrl,
          finalVideoUrl: videoUrl,
          isOptimized: false,
          useFallback: true,
          durationInFrames: 30 * (targetConfig.targetFPS || 30), // 30 seconds default
          shouldSkipLoading: true,
          metadata,
          processingStats: {
            downloadTime,
            optimizationTime: 0,
            totalTime: Date.now() - startTime,
            originalSize: metadata.fileSize,
            finalSize: metadata.fileSize,
            compressionRatio: 1
          },
          success: true
        };
        
        this.stats.fallbackVideos++;
        console.log(`[VideoPreprocessing] Using fallback strategy for ${videoUrl.substring(0, 50)}...`);
        this.emit('preprocessing_fallback', { videoUrl, result, strategy });
        
        return result;
      }
      
      // Step 4: Optimize video if needed
      let optimizationTime = 0;
      let finalVideoUrl = cacheEntry.localUrl;
      let finalSize = metadata.fileSize;
      let isOptimized = false;
      
      if (strategy.action === 'optimize') {
        console.log(`[VideoPreprocessing] Step 4: Optimizing video...`);
        const optimizationStartTime = Date.now();
        
        const optimization = await videoOptimizationService.optimizeVideo(
          videoUrl,
          cacheEntry.localPath,
          {
            targetSizeMB: targetConfig.maxSizeMB,
            maxWidth: targetConfig.maxWidth,
            maxHeight: targetConfig.maxHeight,
            forceOptimization: options.forceOptimization,
            timeoutMs: options.timeoutMs || 180000
          }
        );
        
        optimizationTime = Date.now() - optimizationStartTime;
        
        if (optimization.status === 'completed' && optimization.optimizedUrl) {
          finalVideoUrl = optimization.optimizedUrl;
          finalSize = optimization.optimizationResult?.optimizedSize || metadata.fileSize;
          isOptimized = true;
          
          console.log(`[VideoPreprocessing] Optimization completed:`, {
            originalSize: `${(metadata.fileSize / 1024 / 1024).toFixed(2)}MB`,
            optimizedSize: `${(finalSize / 1024 / 1024).toFixed(2)}MB`,
            compressionRatio: `${(metadata.fileSize / finalSize).toFixed(2)}x`,
            time: `${optimizationTime}ms`
          });
        } else {
          console.warn(`[VideoPreprocessing] Optimization failed, using original video`);
        }
      }
      
      // Step 5: Calculate final parameters for Remotion
      const targetFPS = targetConfig.targetFPS || 30;
      const durationInFrames = Math.round(metadata.duration * targetFPS);
      const shouldSkipLoading = false; // We have local video, no need to skip
      
      const result: PreprocessingResult = {
        originalUrl: videoUrl,
        finalVideoUrl,
        isOptimized,
        useFallback: false,
        durationInFrames,
        shouldSkipLoading,
        metadata: {
          ...metadata,
          optimized: isOptimized,
          finalSize
        },
        processingStats: {
          downloadTime,
          optimizationTime,
          totalTime: Date.now() - startTime,
          originalSize: metadata.fileSize,
          finalSize,
          compressionRatio: metadata.fileSize / finalSize
        },
        success: true
      };
      
      this.stats.successfulProcessing++;
      console.log(`[VideoPreprocessing] Preprocessing completed successfully:`, {
        totalTime: `${result.processingStats.totalTime}ms`,
        finalUrl: result.finalVideoUrl.substring(0, 50) + '...',
        isOptimized: result.isOptimized,
        durationInFrames: result.durationInFrames
      });
      
      this.emit('preprocessing_completed', { videoUrl, result });
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[VideoPreprocessing] Preprocessing failed for ${videoUrl.substring(0, 50)}...`, error);
      
      this.stats.failedProcessing++;
      
      const result: PreprocessingResult = {
        originalUrl: videoUrl,
        finalVideoUrl: videoUrl,
        isOptimized: false,
        useFallback: true,
        durationInFrames: 30 * (request.targetConfig.targetFPS || 30),
        shouldSkipLoading: true,
        metadata: {},
        processingStats: {
          downloadTime: 0,
          optimizationTime: 0,
          totalTime: Date.now() - startTime,
          originalSize: 0,
          finalSize: 0,
          compressionRatio: 1
        },
        success: false,
        error: errorMessage
      };
      
      this.emit('preprocessing_failed', { videoUrl, result, error });
      return result;
    }
  }

  /**
   * Determine the best processing strategy for a video
   */
  private determineProcessingStrategy(
    metadata: any,
    targetConfig: any,
    options: any
  ): { action: 'skip' | 'optimize' | 'fallback'; reason: string } {
    const fileSizeMB = metadata.fileSize / 1024 / 1024;
    const { width, height, bitrate } = metadata;
    
    // Fallback for extremely large files
    if (fileSizeMB > 100) {
      return {
        action: 'fallback',
        reason: `File too large (${fileSizeMB.toFixed(2)}MB > 100MB) - high timeout risk`
      };
    }
    
    // Fallback for very high resolution
    if (width > 2560 || height > 1440) {
      return {
        action: 'fallback',
        reason: `Resolution too high (${width}x${height}) - potential memory issues`
      };
    }
    
    // Optimize if file exceeds target size
    if (fileSizeMB > targetConfig.maxSizeMB) {
      return {
        action: 'optimize',
        reason: `File exceeds target size (${fileSizeMB.toFixed(2)}MB > ${targetConfig.maxSizeMB}MB)`
      };
    }
    
    // Optimize if resolution exceeds target
    if (width > targetConfig.maxWidth || height > targetConfig.maxHeight) {
      return {
        action: 'optimize',
        reason: `Resolution exceeds target (${width}x${height} > ${targetConfig.maxWidth}x${targetConfig.maxHeight})`
      };
    }
    
    // Optimize if bitrate is too high
    if (bitrate > 5000) {
      return {
        action: 'optimize',
        reason: `High bitrate (${bitrate}kbps) may cause loading issues`
      };
    }
    
    // Force optimization if requested
    if (options.forceOptimization) {
      return {
        action: 'optimize',
        reason: 'Force optimization requested'
      };
    }
    
    // Skip optimization - video is already suitable
    return {
      action: 'skip',
      reason: `Video already optimized (${fileSizeMB.toFixed(2)}MB, ${width}x${height})`
    };
  }

  /**
   * Batch preprocess multiple videos
   */
  async batchPreprocess(
    requests: PreprocessingRequest[],
    concurrency: number = 3
  ): Promise<PreprocessingResult[]> {
    console.log(`[VideoPreprocessing] Starting batch preprocessing of ${requests.length} videos with concurrency ${concurrency}`);
    
    const results: PreprocessingResult[] = [];
    const chunks = this.chunkArray(requests, concurrency);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(request => this.preprocessVideo(request))
      );
      
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('[VideoPreprocessing] Batch item failed:', result.reason);
          // Add failed result
          results.push({
            originalUrl: 'unknown',
            finalVideoUrl: 'unknown',
            isOptimized: false,
            useFallback: true,
            durationInFrames: 900,
            shouldSkipLoading: true,
            metadata: {},
            processingStats: {
              downloadTime: 0,
              optimizationTime: 0,
              totalTime: 0,
              originalSize: 0,
              finalSize: 0,
              compressionRatio: 1
            },
            success: false,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      }
    }
    
    console.log(`[VideoPreprocessing] Batch preprocessing completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  /**
   * Get pipeline statistics
   */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  /**
   * Update pipeline statistics
   */
  private updateStats(result: PreprocessingResult): void {
    if (result.success) {
      const newTotalTime = result.processingStats.totalTime;
      this.stats.avgProcessingTime = 
        (this.stats.avgProcessingTime * (this.stats.successfulProcessing - 1) + newTotalTime) / 
        this.stats.successfulProcessing;
      
      if (result.isOptimized) {
        this.stats.totalDataSaved += 
          result.processingStats.originalSize - result.processingStats.finalSize;
      }
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(url: string): string {
    return require('crypto').createHash('sha256').update(url).digest('hex').substring(0, 16);
  }

  /**
   * Chunk array for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const videoPreprocessingPipeline = new VideoPreprocessingPipeline();