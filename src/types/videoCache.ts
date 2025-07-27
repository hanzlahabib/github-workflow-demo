/**
 * TypeScript types for R2 Video Cache System
 * 
 * Handles caching of R2 videos to local storage to solve Node.js
 * networking issues during Remotion rendering.
 */

export interface CacheEntry {
  /** Unique cache entry ID */
  id: string;
  /** Original R2 URL */
  originalUrl: string;
  /** Local file path where video is cached */
  localPath: string;
  /** Local HTTP URL to serve the video */
  localUrl: string;
  /** File size in bytes */
  fileSizeBytes: number;
  /** When the cache entry was created */
  createdAt: Date;
  /** When the cache entry was last accessed */
  lastAccessedAt: Date;
  /** Number of times this cache entry has been accessed */
  accessCount: number;
  /** Content type of the cached video */
  contentType: string;
  /** Video metadata if available */
  metadata?: VideoMetadata;
  /** Cache entry status */
  status: 'downloading' | 'ready' | 'error' | 'expired';
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Time to live in milliseconds */
  ttlMs: number;
  /** Tags for cache categorization */
  tags: string[];
}

export interface VideoMetadata {
  /** Video duration in seconds */
  duration?: number;
  /** Video width in pixels */
  width?: number;
  /** Video height in pixels */
  height?: number;
  /** Video bitrate */
  bitrate?: number;
  /** Video framerate */
  fps?: number;
  /** Video codec */
  codec?: string;
  /** Optimization status */
  optimizationStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  /** Whether optimization has been completed */
  optimizationCompleted?: boolean;
}

export interface CacheConfig {
  /** Maximum cache size in bytes (default: 10GB) */
  maxSizeBytes: number;
  /** Maximum number of cache entries (default: 1000) */
  maxEntries: number;
  /** Default TTL for cache entries in milliseconds (default: 7 days) */
  defaultTtlMs: number;
  /** Directory to store cached videos */
  cacheDirectory: string;
  /** Local HTTP server port for serving videos */
  proxyPort: number;
  /** Enable background cleanup */
  enableBackgroundCleanup: boolean;
  /** Cleanup interval in milliseconds (default: 1 hour) */
  cleanupIntervalMs: number;
  /** Enable pre-caching of popular videos */
  enablePreCaching: boolean;
  /** Maximum concurrent downloads */
  maxConcurrentDownloads: number;
  /** Download timeout in milliseconds */
  downloadTimeoutMs: number;
  /** Retry attempts for failed downloads */
  maxRetryAttempts: number;
  /** Enable automatic video optimization (default: true) */
  enableVideoOptimization?: boolean;
  /** Target size for optimization in MB (default: 10) */
  optimizationTargetSizeMB?: number;
  /** Auto-optimize videos larger than this size in MB (default: 20) */
  autoOptimizeThresholdMB?: number;
}

export interface CacheStats {
  /** Current cache size in bytes */
  currentSizeBytes: number;
  /** Number of entries in cache */
  entryCount: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Cache miss rate (0-1) */
  missRate: number;
  /** Total cache hits */
  totalHits: number;
  /** Total cache misses */
  totalMisses: number;
  /** Average download time in milliseconds */
  avgDownloadTimeMs: number;
  /** Last cleanup time */
  lastCleanupAt?: Date;
  /** Cache directory path */
  cacheDirectory: string;
  /** Available disk space in bytes */
  availableDiskSpaceBytes: number;
}

export interface DownloadProgress {
  /** Downloaded bytes */
  downloadedBytes: number;
  /** Total bytes to download */
  totalBytes: number;
  /** Download progress as percentage (0-100) */
  progressPercent: number;
  /** Download speed in bytes per second */
  speedBytesPerSecond: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemainingMs: number;
}

export interface CacheOperation {
  /** Operation type */
  type: 'download' | 'serve' | 'cleanup' | 'delete';
  /** URL being processed */
  url: string;
  /** Operation status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** Start time */
  startedAt: Date;
  /** End time if completed */
  completedAt?: Date;
  /** Error message if failed */
  error?: string;
  /** Progress information for downloads */
  progress?: DownloadProgress;
}

export interface R2UrlDetectionResult {
  /** Whether R2 URLs were found */
  hasR2Urls: boolean;
  /** List of detected R2 URLs */
  r2Urls: string[];
  /** Updated config with local URLs */
  updatedConfig: any;
  /** Mapping of original URL to local URL */
  urlMappings: Record<string, string>;
}

export interface CacheCleanupResult {
  /** Number of entries removed */
  removedEntries: number;
  /** Bytes freed */
  bytesFreed: number;
  /** Cleanup duration in milliseconds */
  cleanupDurationMs: number;
  /** Cleanup strategy used */
  strategy: 'lru' | 'size_limit' | 'ttl_expired' | 'manual';
  /** Any errors encountered during cleanup */
  errors: string[];
}

export interface PreCacheRequest {
  /** URLs to pre-cache */
  urls: string[];
  /** Priority level for pre-caching */
  priority: 'low' | 'medium' | 'high';
  /** Tags to apply to pre-cached entries */
  tags?: string[];
  /** Custom TTL for pre-cached entries */
  customTtlMs?: number;
}

export interface CacheSearchOptions {
  /** Search by URL pattern */
  urlPattern?: string;
  /** Search by tags */
  tags?: string[];
  /** Search by status */
  status?: CacheEntry['status'];
  /** Sort by field */
  sortBy?: 'createdAt' | 'lastAccessedAt' | 'accessCount' | 'fileSizeBytes';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Limit results */
  limit?: number;
  /** Skip results */
  skip?: number;
}

export interface CacheHealthCheck {
  /** Overall cache health status */
  status: 'healthy' | 'warning' | 'critical';
  /** Health check timestamp */
  timestamp: Date;
  /** Disk space status */
  diskSpace: {
    total: number;
    available: number;
    used: number;
    usagePercent: number;
  };
  /** Cache metrics */
  metrics: CacheStats;
  /** Issues found during health check */
  issues: string[];
  /** Recommendations for optimization */
  recommendations: string[];
}

// Error types for cache operations
export class CacheError extends Error {
  constructor(
    message: string,
    public code: string,
    public url?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

export class DownloadError extends CacheError {
  constructor(message: string, url: string, cause?: Error) {
    super(message, 'DOWNLOAD_ERROR', url, cause);
    this.name = 'DownloadError';
  }
}

export class StorageError extends CacheError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', undefined, cause);
    this.name = 'StorageError';
  }
}

export class ProxyError extends CacheError {
  constructor(message: string, url?: string, cause?: Error) {
    super(message, 'PROXY_ERROR', url, cause);
    this.name = 'ProxyError';
  }
}