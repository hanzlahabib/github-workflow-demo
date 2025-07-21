/**
 * Comprehensive caching service with Redis and in-memory fallback
 * Optimizes API responses for frequently accessed but rarely changed data
 */

// External dependencies
import Redis from 'ioredis';

// Types
import type { CacheConfig, CacheStats } from '../types/services';

// Memory cache interface for fallback
interface MemoryCacheItem {
  data: any;
  expires: number;
}

class CacheService {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, MemoryCacheItem>();
  private config: CacheConfig;
  private isRedisConnected = false;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeRedis();
  }

  private async initializeRedis() {
    if (!this.config.redis) {
      console.log('[Cache] Redis config not provided, using memory-only cache');
      return;
    }

    try {
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db || 0,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      await this.redis.connect();
      this.isRedisConnected = true;
      console.log('[Cache] ✅ Redis cache connected successfully');

      this.redis.on('error', (err) => {
        console.error('[Cache] Redis error:', err);
        this.isRedisConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('[Cache] Redis reconnected');
        this.isRedisConnected = true;
      });

    } catch (error) {
      console.error('[Cache] Failed to connect to Redis:', error);
      this.isRedisConnected = false;
      if (this.config.memoryFallback) {
        console.log('[Cache] Falling back to memory cache');
      }
    }
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redis && this.isRedisConnected) {
        const cached = await this.redis.get(key);
        if (cached) {
          console.log(`[Cache] ✅ Redis hit for key: ${key}`);
          return JSON.parse(cached);
        }
      }

      // Fallback to memory cache
      if (this.config.memoryFallback) {
        const memoryCached = this.memoryCache.get(key);
        if (memoryCached && memoryCached.expires > Date.now()) {
          console.log(`[Cache] ✅ Memory hit for key: ${key}`);
          return memoryCached.data;
        } else if (memoryCached) {
          // Remove expired entry
          this.memoryCache.delete(key);
        }
      }

      console.log(`[Cache] ❌ Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      console.error(`[Cache] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set(key: string, data: any, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.config.defaultTTL;

    try {
      // Set in Redis if available
      if (this.redis && this.isRedisConnected) {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        console.log(`[Cache] ✅ Redis set for key: ${key} (TTL: ${ttl}s)`);
      }

      // Also set in memory cache as fallback
      if (this.config.memoryFallback) {
        this.memoryCache.set(key, {
          data,
          expires: Date.now() + (ttl * 1000)
        });
        console.log(`[Cache] ✅ Memory set for key: ${key} (TTL: ${ttl}s)`);
      }
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.redis && this.isRedisConnected) {
        await this.redis.del(key);
      }

      if (this.config.memoryFallback) {
        this.memoryCache.delete(key);
      }

      console.log(`[Cache] ✅ Deleted key: ${key}`);
    } catch (error) {
      console.error(`[Cache] Error deleting key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async flush(): Promise<void> {
    try {
      if (this.redis && this.isRedisConnected) {
        await this.redis.flushdb();
      }

      if (this.config.memoryFallback) {
        this.memoryCache.clear();
      }

      console.log('[Cache] ✅ Cache flushed');
    } catch (error) {
      console.error('[Cache] Error flushing cache:', error);
    }
  }

  /**
   * Cache with automatic key generation and refresh logic
   */
  async cacheWrapper<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch fresh data
    console.log(`[Cache] Fetching fresh data for key: ${key}`);
    const startTime = Date.now();

    try {
      const freshData = await fetchFunction();
      const fetchTime = Date.now() - startTime;

      console.log(`[Cache] ✅ Fresh data fetched in ${fetchTime}ms for key: ${key}`);

      // Cache the fresh data
      await this.set(key, freshData, ttlSeconds);

      return freshData;
    } catch (error) {
      console.error(`[Cache] Error fetching fresh data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired memory cache entries
   */
  cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.memoryCache.entries());
    for (const [key, item] of entries) {
      if (item.expires <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired memory cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    const stats: any = {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      redis: {
        connected: this.isRedisConnected
      }
    };

    if (this.redis && this.isRedisConnected) {
      try {
        const info = await this.redis.info('memory');
        stats.redis.info = info;
      } catch (error) {
        stats.redis.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return stats;
  }
}

// Global cache service instance
let cacheService: CacheService | null = null;

/**
 * Initialize the cache service
 */
export function initializeCacheService(config: CacheConfig): CacheService {
  if (cacheService) {
    return cacheService;
  }

  cacheService = new CacheService(config);

  // Set up periodic memory cleanup
  if (config.memoryFallback) {
    setInterval(() => {
      cacheService?.cleanupMemoryCache();
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  return cacheService;
}

/**
 * Get the cache service instance
 */
export function getCacheService(): CacheService {
  if (!cacheService) {
    throw new Error('Cache service not initialized. Call initializeCacheService() first.');
  }
  return cacheService;
}

/**
 * Cache key generators for different data types
 */
export const CacheKeys = {
  // Voice service keys
  VOICES_LIST: 'voices:list',
  VOICE_DETAIL: (voiceId: string) => `voices:detail:${voiceId}`,
  VOICE_SETTINGS: (voiceId: string) => `voices:settings:${voiceId}`,
  SUPPORTED_LANGUAGES: 'voices:languages',
  USER_VOICE_HISTORY: (userId: string) => `voices:history:${userId}`,

  // OpenAI service keys
  OPENAI_MODELS: 'openai:models',
  SCRIPT_GENERATION: (topic: string, videoType: string, duration: number) =>
    `openai:script:${videoType}:${topic}:${duration}`,
  CONTENT_OPTIMIZATION: (content: string, platform: string, goal: string) =>
    `openai:optimize:${platform}:${goal}:${Buffer.from(content).toString('base64').slice(0, 32)}`,
  TREND_ANALYSIS: (niche: string, timeframe: string, region?: string) =>
    `openai:trends:${niche}:${timeframe}${region ? ':' + region : ''}`,
  QUIZ_GENERATION: (topic: string, count: number, difficulty: string) =>
    `openai:quiz:${topic}:${count}:${difficulty}`,

  // Whisper service keys
  TRANSCRIPTION: (audioHash: string, language?: string) =>
    `whisper:transcription:${audioHash}${language ? ':' + language : ''}`,
  CAPTION_GENERATION: (audioHash: string, options: string) =>
    `whisper:captions:${audioHash}:${options}`,

  // S3 service keys
  OBJECT_LIST: (prefix: string) => `s3:list:${prefix}`,
  SIGNED_URL: (key: string, operation: string) => `s3:signed:${operation}:${key}`,

  // Remotion service keys
  COMPOSITION_LIST: 'remotion:compositions',
  RENDER_TEMPLATE: (templateId: string, propsHash: string) =>
    `remotion:render:${templateId}:${propsHash}`,

  // DALL-E service keys
  IMAGE_GENERATION: (prompt: string, size: string, style: string) =>
    `dalle:image:${size}:${style}:${Buffer.from(prompt).toString('base64').slice(0, 32)}`,
} as const;

/**
 * Cache TTL configurations (in seconds)
 */
export const CacheTTL = {
  // Voice service TTLs
  VOICES_LIST: 30 * 60, // 30 minutes - voices rarely change
  VOICE_DETAIL: 60 * 60, // 1 hour - voice details rarely change
  VOICE_SETTINGS: 10 * 60, // 10 minutes - settings might change more often
  SUPPORTED_LANGUAGES: 24 * 60 * 60, // 24 hours - languages very stable
  USER_VOICE_HISTORY: 5 * 60, // 5 minutes - user data changes more frequently

  // OpenAI service TTLs
  OPENAI_MODELS: 60 * 60, // 1 hour - models change infrequently
  SCRIPT_GENERATION: 2 * 60 * 60, // 2 hours - scripts can be reused for same inputs
  CONTENT_OPTIMIZATION: 30 * 60, // 30 minutes - optimizations may need updates
  TREND_ANALYSIS: 4 * 60 * 60, // 4 hours - trends change but not too quickly
  QUIZ_GENERATION: 6 * 60 * 60, // 6 hours - quiz content is fairly stable

  // Whisper service TTLs
  TRANSCRIPTION: 24 * 60 * 60, // 24 hours - transcriptions don't change
  CAPTION_GENERATION: 24 * 60 * 60, // 24 hours - captions don't change

  // S3 service TTLs
  OBJECT_LIST: 5 * 60, // 5 minutes - object lists change frequently
  SIGNED_URL: 10 * 60, // 10 minutes - signed URLs have their own expiry

  // Remotion service TTLs
  COMPOSITION_LIST: 60 * 60, // 1 hour - compositions change infrequently
  RENDER_TEMPLATE: 12 * 60 * 60, // 12 hours - rendered videos are expensive to recreate

  // DALL-E service TTLs
  IMAGE_GENERATION: 24 * 60 * 60, // 24 hours - generated images don't change
} as const;

export default CacheService;
