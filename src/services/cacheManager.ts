/**
 * Cache Manager
 * 
 * High-level cache management service that coordinates between
 * R2VideoCacheService and VideoProxyService with smart policies,
 * monitoring, and optimization strategies.
 */

import { EventEmitter } from 'events';
import path from 'path';
import { scheduleJob, Job } from 'node-schedule';

import { r2VideoCache, R2VideoCacheService } from './r2VideoCache';
import { videoProxyService, VideoProxyService } from './videoProxyService';
import type {
  CacheConfig,
  CacheStats,
  CacheHealthCheck,
  CacheCleanupResult,
  PreCacheRequest,
  CacheSearchOptions,
  CacheEntry,
  R2UrlDetectionResult
} from '../types/videoCache';

interface CacheManagerConfig {
  /** Enable automatic cache optimization */
  enableAutoOptimization: boolean;
  /** Enable smart pre-caching based on usage patterns */
  enableSmartPreCaching: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Health check interval in milliseconds */
  healthCheckIntervalMs: number;
  /** Auto-optimization interval (cron expression) */
  optimizationSchedule: string;
  /** Pre-caching schedule (cron expression) */
  preCachingSchedule: string;
  /** Maximum pre-cache requests per hour */
  maxPreCachePerHour: number;
  /** Performance alert thresholds */
  performanceThresholds: {
    maxDownloadTimeMs: number;
    maxCacheSize: number;
    minHitRate: number;
    maxDiskUsagePercent: number;
  };
}

interface PerformanceMetrics {
  averageDownloadTimeMs: number;
  averageServeTimeMs: number;
  cacheEfficiency: number;
  diskUsagePercent: number;
  networkSavings: number;
  lastOptimizationAt?: Date;
  alertsGenerated: string[];
}

export class CacheManager extends EventEmitter {
  private config: CacheManagerConfig;
  private cacheService: R2VideoCacheService;
  private proxyService: VideoProxyService;
  private healthCheckTimer?: NodeJS.Timeout;
  private optimizationJob?: Job;
  private preCachingJob?: Job;
  private metrics: PerformanceMetrics;
  private preCacheRequests: Map<string, Date> = new Map();
  private initialized = false;

  constructor(
    config?: Partial<CacheManagerConfig>,
    cacheService?: R2VideoCacheService,
    proxyService?: VideoProxyService
  ) {
    super();

    this.config = {
      enableAutoOptimization: true,
      enableSmartPreCaching: true,
      enablePerformanceMonitoring: true,
      healthCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
      optimizationSchedule: '0 2 * * *', // Daily at 2 AM
      preCachingSchedule: '0 */6 * * *', // Every 6 hours
      maxPreCachePerHour: 20,
      performanceThresholds: {
        maxDownloadTimeMs: 60000, // 1 minute
        maxCacheSize: 8 * 1024 * 1024 * 1024, // 8GB
        minHitRate: 0.7, // 70%
        maxDiskUsagePercent: 85
      },
      ...config
    };

    this.cacheService = cacheService || r2VideoCache;
    this.proxyService = proxyService || videoProxyService;

    this.metrics = {
      averageDownloadTimeMs: 0,
      averageServeTimeMs: 0,
      cacheEfficiency: 0,
      diskUsagePercent: 0,
      networkSavings: 0,
      alertsGenerated: []
    };

    this.setupEventListeners();
  }

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[CacheManager] Initializing cache management system...');

    try {
      // Initialize cache service
      await this.cacheService.initialize();

      // Start proxy service
      try {
        await this.proxyService.start();
      } catch (error) {
        console.warn('[CacheManager] Failed to start proxy service:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.message.includes('already in use')) {
          console.log('[CacheManager] Proxy service may already be running on another port');
        }
      }

      // Start health monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.startHealthMonitoring();
      }

      // Schedule optimization tasks
      if (this.config.enableAutoOptimization) {
        this.scheduleOptimization();
      }

      // Schedule pre-caching
      if (this.config.enableSmartPreCaching) {
        this.schedulePreCaching();
      }

      // Perform initial health check
      await this.performHealthCheck();

      this.initialized = true;
      console.log('[CacheManager] Cache management system initialized successfully');
      
      this.emit('initialized', {
        cacheStats: this.cacheService.getCacheStats(),
        proxyStats: this.proxyService.getStats(),
        metrics: this.metrics
      });

    } catch (error) {
      console.error('[CacheManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for cache and proxy services
   */
  private setupEventListeners(): void {
    // Cache service events
    this.cacheService.on('download_completed', (event) => {
      this.updateDownloadMetrics(event);
      this.emit('video_cached', event);
    });

    this.cacheService.on('cache_hit', (event) => {
      this.updateCacheHitMetrics(event);
    });

    this.cacheService.on('download_failed', (event) => {
      this.handleDownloadFailure(event);
    });

    // Proxy service events
    this.proxyService.on('video_served', (event) => {
      this.updateServeMetrics(event);
    });

    // Health monitoring
    this.on('health_check_completed', (health) => {
      this.analyzeHealthAndTriggerActions(health);
    });
  }

  /**
   * Process video config and cache R2 videos before rendering with optimization
   */
  async processVideoConfig(config: any): Promise<R2UrlDetectionResult> {
    console.log('[CacheManager] Processing video config for R2 URLs with optimization...');
    
    const r2Urls = this.detectR2Urls(config);
    
    if (r2Urls.length === 0) {
      console.log('[CacheManager] No R2 URLs found in config');
      return {
        hasR2Urls: false,
        r2Urls: [],
        updatedConfig: config,
        urlMappings: {}
      };
    }

    console.log(`[CacheManager] Found ${r2Urls.length} R2 URLs, caching and optimizing for Remotion...`);
    
    const urlMappings: Record<string, string> = {};
    const optimizationMetadata: Record<string, any> = {};
    
    const cachePromises = r2Urls.map(async (url) => {
      try {
        console.log(`[CacheManager] Processing R2 video for Remotion: ${url.substring(0, 80)}...`);
        
        // Use the optimized video processing for Remotion
        const optimizedResult = await this.cacheService.getOptimizedVideoForRemotion(url);
        
        console.log(`[CacheManager] ✓ Optimization result:`, {
          url: url.substring(0, 50) + '...',
          useFallback: optimizedResult.useFallback,
          shouldSkipLoading: optimizedResult.shouldSkipLoading,
          durationInFrames: optimizedResult.durationInFrames,
          isOptimized: optimizedResult.isOptimized
        });

        // Store the optimized video URL (could be local cached, optimized, or original)
        urlMappings[url] = optimizedResult.videoUrl;
        
        // Store metadata for potential use in Remotion compositions
        optimizationMetadata[url] = {
          durationInFrames: optimizedResult.durationInFrames,
          shouldSkipLoading: optimizedResult.shouldSkipLoading,
          useFallback: optimizedResult.useFallback,
          metadata: optimizedResult.metadata,
          isOptimized: optimizedResult.isOptimized
        };
        
        return { 
          success: true, 
          url, 
          localUrl: optimizedResult.videoUrl,
          optimization: optimizedResult
        };
      } catch (error) {
        console.error(`[CacheManager] ✗ Failed to process ${url.substring(0, 80)}...:`, error);
        // Keep original URL if processing fails
        urlMappings[url] = url;
        return { success: false, url, error };
      }
    });

    // Wait for all caching operations to complete
    const results = await Promise.allSettled(cachePromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    console.log(`[CacheManager] Processed ${successCount}/${r2Urls.length} R2 videos successfully with optimization`);

    // Replace R2 URLs with optimized URLs in config
    const updatedConfig = this.replaceUrlsInConfig(config, urlMappings);
    
    // Add optimization metadata to the config for Remotion usage
    if (Object.keys(optimizationMetadata).length > 0) {
      updatedConfig._videoOptimizationMetadata = optimizationMetadata;
      console.log('[CacheManager] ✅ Added optimization metadata to config for Remotion');
    }

    this.emit('config_processed', {
      originalUrls: r2Urls,
      urlMappings,
      optimizationMetadata,
      successCount,
      failureCount: r2Urls.length - successCount
    });

    return {
      hasR2Urls: true,
      r2Urls,
      updatedConfig,
      urlMappings
    };
  }

  /**
   * Detect R2 URLs in video configuration
   */
  private detectR2Urls(config: any, urls: string[] = []): string[] {
    if (!config || typeof config !== 'object') {
      return urls;
    }

    // Check if current value is an R2 URL
    if (typeof config === 'string' && this.isR2Url(config)) {
      if (!urls.includes(config)) {
        urls.push(config);
      }
      return urls;
    }

    // Recursively search object properties
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        const value = config[key];
        
        // Check direct string values
        if (typeof value === 'string' && this.isR2Url(value)) {
          if (!urls.includes(value)) {
            urls.push(value);
          }
        }
        // Recursively check objects and arrays
        else if (typeof value === 'object' && value !== null) {
          this.detectR2Urls(value, urls);
        }
      }
    }

    return urls;
  }

  /**
   * Check if URL is an R2 URL
   */
  private isR2Url(url: string): boolean {
    return typeof url === 'string' && 
           url.includes('.r2.dev') && 
           (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov'));
  }

  /**
   * Replace R2 URLs with local URLs in configuration
   */
  private replaceUrlsInConfig(config: any, urlMappings: Record<string, string>): any {
    if (!config || typeof config !== 'object') {
      return config;
    }

    // Handle arrays
    if (Array.isArray(config)) {
      return config.map(item => this.replaceUrlsInConfig(item, urlMappings));
    }

    // Handle objects
    const result: any = {};
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        const value = config[key];
        
        // Replace string URLs
        if (typeof value === 'string' && urlMappings[value]) {
          const localUrl = urlMappings[value];
          result[key] = localUrl;
          console.log(`[CacheManager] ✓ Replaced URL in ${key}:`);
          console.log(`[CacheManager]   Original: ${value.substring(0, 80)}...`);
          console.log(`[CacheManager]   Local:    ${localUrl}`);
        }
        // Recursively process objects
        else if (typeof value === 'object' && value !== null) {
          result[key] = this.replaceUrlsInConfig(value, urlMappings);
        }
        // Keep other values as-is
        else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Perform health check on cache system
   */
  async performHealthCheck(): Promise<CacheHealthCheck> {
    console.log('[CacheManager] Performing health check...');
    
    const cacheStats = this.cacheService.getCacheStats();
    const proxyStats = this.proxyService.getStats();
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check disk space
    const diskUsagePercent = cacheStats.availableDiskSpaceBytes > 0 
      ? ((cacheStats.currentSizeBytes / (cacheStats.availableDiskSpaceBytes + cacheStats.currentSizeBytes)) * 100)
      : 0;

    if (diskUsagePercent > this.config.performanceThresholds.maxDiskUsagePercent) {
      issues.push(`High disk usage: ${diskUsagePercent.toFixed(1)}%`);
      recommendations.push('Consider increasing cleanup frequency or reducing cache size limits');
    }

    // Check cache hit rate
    if (cacheStats.hitRate < this.config.performanceThresholds.minHitRate) {
      issues.push(`Low cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
      recommendations.push('Enable smart pre-caching or review cache TTL settings');
    }

    // Check cache size
    if (cacheStats.currentSizeBytes > this.config.performanceThresholds.maxCacheSize) {
      issues.push(`Cache size exceeded: ${this.formatBytes(cacheStats.currentSizeBytes)}`);
      recommendations.push('Trigger immediate cleanup or increase cache size limits');
    }

    // Check proxy server
    if (!this.proxyService.isServerRunning()) {
      issues.push('Proxy server is not running');
      recommendations.push('Restart proxy service');
    }

    // Check for errors
    if (proxyStats.errors > 0) {
      issues.push(`Proxy serving errors detected: ${proxyStats.errors}`);
      recommendations.push('Check proxy server logs for detailed error information');
    }

    // Determine overall health status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(issue => 
        issue.includes('not running') || 
        issue.includes('exceeded') ||
        diskUsagePercent > 95
      ) ? 'critical' : 'warning';
    }

    const healthCheck: CacheHealthCheck = {
      status,
      timestamp: new Date(),
      diskSpace: {
        total: cacheStats.availableDiskSpaceBytes + cacheStats.currentSizeBytes,
        available: cacheStats.availableDiskSpaceBytes,
        used: cacheStats.currentSizeBytes,
        usagePercent: diskUsagePercent
      },
      metrics: cacheStats,
      issues,
      recommendations
    };

    // Update internal metrics
    this.metrics.diskUsagePercent = diskUsagePercent;
    this.metrics.cacheEfficiency = cacheStats.hitRate;

    console.log(`[CacheManager] Health check completed: ${status}`);
    if (issues.length > 0) {
      console.warn(`[CacheManager] Issues found:`, issues);
    }

    this.emit('health_check_completed', healthCheck);
    return healthCheck;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    console.log('[CacheManager] Starting health monitoring...');
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[CacheManager] Health check failed:', error);
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Schedule automatic optimization
   */
  private scheduleOptimization(): void {
    console.log(`[CacheManager] Scheduling optimization: ${this.config.optimizationSchedule}`);
    
    this.optimizationJob = scheduleJob(this.config.optimizationSchedule, async () => {
      try {
        console.log('[CacheManager] Running scheduled optimization...');
        await this.optimizeCache();
      } catch (error) {
        console.error('[CacheManager] Scheduled optimization failed:', error);
      }
    });
  }

  /**
   * Schedule smart pre-caching
   */
  private schedulePreCaching(): void {
    console.log(`[CacheManager] Scheduling pre-caching: ${this.config.preCachingSchedule}`);
    
    this.preCachingJob = scheduleJob(this.config.preCachingSchedule, async () => {
      try {
        console.log('[CacheManager] Running scheduled pre-caching...');
        await this.runSmartPreCaching();
      } catch (error) {
        console.error('[CacheManager] Scheduled pre-caching failed:', error);
      }
    });
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache(): Promise<CacheCleanupResult> {
    console.log('[CacheManager] Starting cache optimization...');
    
    const health = await this.performHealthCheck();
    let strategy: 'lru' | 'size_limit' | 'ttl_expired' = 'lru';

    // Choose optimization strategy based on health
    if (health.diskSpace.usagePercent > 80) {
      strategy = 'size_limit';
    } else if (health.metrics.hitRate < 0.5) {
      strategy = 'ttl_expired';
    }

    const result = await this.cacheService.cleanup(strategy);
    this.metrics.lastOptimizationAt = new Date();

    console.log(`[CacheManager] Optimization completed using ${strategy} strategy:`, result);
    this.emit('optimization_completed', { strategy, result, health });

    return result;
  }

  /**
   * Run smart pre-caching based on usage patterns
   */
  private async runSmartPreCaching(): Promise<void> {
    console.log('[CacheManager] Running smart pre-caching...');
    
    // For now, this is a placeholder for smart pre-caching logic
    // In production, this would analyze usage patterns and pre-cache popular videos
    
    // Simple implementation: clear expired pre-cache requests
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    for (const [url, timestamp] of this.preCacheRequests.entries()) {
      if (timestamp < oneHourAgo) {
        this.preCacheRequests.delete(url);
      }
    }

    console.log('[CacheManager] Smart pre-caching completed');
  }

  /**
   * Update download metrics
   */
  private updateDownloadMetrics(event: any): void {
    if (event.operation && event.operation.completedAt && event.operation.startedAt) {
      const downloadTime = event.operation.completedAt.getTime() - event.operation.startedAt.getTime();
      
      // Update rolling average
      if (this.metrics.averageDownloadTimeMs === 0) {
        this.metrics.averageDownloadTimeMs = downloadTime;
      } else {
        this.metrics.averageDownloadTimeMs = 
          (this.metrics.averageDownloadTimeMs * 0.9) + (downloadTime * 0.1);
      }
    }
  }

  /**
   * Update cache hit metrics
   */
  private updateCacheHitMetrics(event: any): void {
    // Calculate network savings (estimated)
    if (event.entry && event.entry.fileSizeBytes) {
      this.metrics.networkSavings += event.entry.fileSizeBytes;
    }
  }

  /**
   * Update serve metrics
   */
  private updateServeMetrics(event: any): void {
    // Update serve time metrics if available
    // This would be implemented based on proxy response times
  }

  /**
   * Handle download failures
   */
  private handleDownloadFailure(event: any): void {
    const alert = `Download failed for ${event.url}: ${event.error.message}`;
    this.metrics.alertsGenerated.push(alert);
    
    // Keep only last 10 alerts
    if (this.metrics.alertsGenerated.length > 10) {
      this.metrics.alertsGenerated.shift();
    }

    this.emit('download_failure_alert', { url: event.url, error: event.error });
  }

  /**
   * Analyze health and trigger automatic actions
   */
  private analyzeHealthAndTriggerActions(health: CacheHealthCheck): void {
    // Only trigger cleanup if disk usage is critical, not for proxy issues
    const hasDiskIssues = health.issues.some(issue => 
      issue.includes('exceeded') || 
      issue.includes('disk usage') ||
      health.diskSpace.usagePercent > 95
    );

    if (health.status === 'critical' && hasDiskIssues) {
      console.warn('[CacheManager] Critical disk issues detected, triggering emergency cleanup...');
      this.optimizeCache().catch(error => {
        console.error('[CacheManager] Emergency cleanup failed:', error);
      });
    } else if (health.status === 'critical') {
      console.warn('[CacheManager] Critical health issues detected (non-disk):');
      health.issues.forEach(issue => console.warn(`[CacheManager]   - ${issue}`));
    }

    // Generate alerts for persistent issues
    if (health.issues.length > 0) {
      this.emit('health_alert', {
        status: health.status,
        issues: health.issues,
        recommendations: health.recommendations
      });
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getComprehensiveStats(): {
    cache: CacheStats;
    proxy: any;
    manager: PerformanceMetrics;
    health: string;
  } {
    return {
      cache: this.cacheService.getCacheStats(),
      proxy: this.proxyService.getStats(),
      manager: { ...this.metrics },
      health: this.initialized ? 'running' : 'not_initialized'
    };
  }

  /**
   * Manual cache cleanup
   */
  async clearCache(pattern?: string): Promise<CacheCleanupResult> {
    console.log(`[CacheManager] Manual cache clear${pattern ? ` (pattern: ${pattern})` : ''}...`);
    
    // For now, clear all cache using manual strategy
    const result = await this.cacheService.cleanup('manual');
    
    console.log('[CacheManager] Manual cache clear completed:', result);
    this.emit('manual_cache_cleared', result);
    
    return result;
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
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    console.log('[CacheManager] Shutting down cache manager...');

    // Clear timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Cancel scheduled jobs
    if (this.optimizationJob) {
      this.optimizationJob.cancel();
    }

    if (this.preCachingJob) {
      this.preCachingJob.cancel();
    }

    // Shutdown services
    await this.proxyService.shutdown();
    await this.cacheService.shutdown();

    this.removeAllListeners();
    this.initialized = false;
    
    console.log('[CacheManager] Cache manager shutdown complete');
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();