/**
 * Base Service Class
 * Provides standardized patterns for all AI and external services
 * - Consistent error handling with retry logic
 * - Standardized configuration validation
 * - Built-in logging and metrics
 * - Connection testing interface
 * - Cache integration patterns
 */

import { getCacheService, CacheKeys, CacheTTL } from './cache';

export interface ServiceConfig {
  name: string;
  version?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
  enableCaching?: boolean;
}

export interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: Date | null;
  uptime: number;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
  fromCache?: boolean;
  retryCount?: number;
}

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Abstract base class that all services should extend
 */
export interface BaseServiceInterface {
  testConnection(): Promise<boolean>;
}

export abstract class BaseService implements BaseServiceInterface {
  protected serviceName: string;
  protected version: string;
  protected timeout: number;
  protected maxRetries: number;
  protected retryDelay: number;
  protected enableMetrics: boolean;
  protected enableCaching: boolean;
  protected metrics: ServiceMetrics;
  protected startTime: Date;

  constructor(config: ServiceConfig) {
    this.serviceName = config.name;
    this.version = config.version || '1.0.0';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.enableMetrics = config.enableMetrics !== false;
    this.enableCaching = config.enableCaching !== false;
    this.startTime = new Date();

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      uptime: 0,
    };

    this.log('info', `Service ${this.serviceName} v${this.version} initialized`);
  }

  /**
   * Abstract method for service-specific configuration validation
   */
  protected abstract validateConfig(config: any): void;

  /**
   * Abstract method for testing service connectivity
   */
  public abstract testConnection(): Promise<boolean>;

  /**
   * Standard error handling wrapper for all service operations
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      useCache?: boolean;
      cacheKey?: string;
      cacheTTL?: number;
      retryOptions?: RetryOptions;
    } = {}
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxAttempts = options.retryOptions?.maxAttempts || this.maxRetries;

    this.updateMetrics('start', startTime);

    // Try cache first if enabled
    if (this.enableCaching && options.useCache && options.cacheKey) {
      try {
        const cached = await this.getFromCache<T>(options.cacheKey);
        if (cached !== null) {
          const duration = Date.now() - startTime;
          this.updateMetrics('success', startTime, duration);
          this.log('debug', `Cache hit for ${operationName}: ${options.cacheKey}`);

          return {
            success: true,
            data: cached,
            duration,
            fromCache: true,
            retryCount: 0,
          };
        }
      } catch (cacheError) {
        this.log('warn', `Cache retrieval failed for ${operationName}: ${cacheError}`);
      }
    }

    // Execute operation with retry logic
    while (retryCount < maxAttempts) {
      try {
        this.log('debug', `Executing ${operationName} (attempt ${retryCount + 1}/${maxAttempts})`);

        const result = await this.executeWithTimeout(operation(), this.timeout);
        const duration = Date.now() - startTime;

        // Store in cache if successful and caching is enabled
        if (this.enableCaching && options.useCache && options.cacheKey && result !== null) {
          try {
            await this.storeInCache(options.cacheKey, result, options.cacheTTL);
            this.log('debug', `Result cached for ${operationName}: ${options.cacheKey}`);
          } catch (cacheError) {
            this.log('warn', `Failed to cache result for ${operationName}: ${cacheError}`);
          }
        }

        this.updateMetrics('success', startTime, duration);
        this.log('info', `${operationName} completed successfully in ${duration}ms`);

        return {
          success: true,
          data: result,
          duration,
          fromCache: false,
          retryCount,
        };

      } catch (error) {
        retryCount++;
        const duration = Date.now() - startTime;

        const shouldRetry = this.shouldRetry(error, retryCount, maxAttempts, options.retryOptions);

        if (shouldRetry) {
          const delay = this.calculateRetryDelay(retryCount, options.retryOptions);
          this.log('warn', `${operationName} failed (attempt ${retryCount}/${maxAttempts}), retrying in ${delay}ms: ${error}`);

          await this.sleep(delay);
          continue;
        }

        this.updateMetrics('error', startTime, duration);
        this.log('error', `${operationName} failed after ${retryCount} attempts: ${error}`);

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
          fromCache: false,
          retryCount,
        };
      }
    }

    // This should never be reached, but included for type safety
    const duration = Date.now() - startTime;
    this.updateMetrics('error', startTime, duration);

    return {
      success: false,
      error: `Operation failed after ${maxAttempts} attempts`,
      duration,
      fromCache: false,
      retryCount,
    };
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Determine if operation should be retried based on error and retry options
   */
  private shouldRetry(
    error: any,
    currentAttempt: number,
    maxAttempts: number,
    retryOptions?: RetryOptions
  ): boolean {
    if (currentAttempt >= maxAttempts) {
      return false;
    }

    // If custom retry condition is provided, use it
    if (retryOptions?.retryCondition) {
      return retryOptions.retryCondition(error);
    }

    // Default retry conditions
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // Retry on specific HTTP status codes
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Retry on rate limiting
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, retryOptions?: RetryOptions): number {
    const baseDelay = retryOptions?.delay || this.retryDelay;
    const backoffFactor = retryOptions?.backoffFactor || 2;

    return Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), 30000); // Max 30 seconds
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get data from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cacheService = getCacheService();
      return await cacheService.get<T>(key);
    } catch (error) {
      // Cache service not available, return null
      return null;
    }
  }

  /**
   * Store data in cache
   */
  private async storeInCache<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cacheService = getCacheService();
      await cacheService.set(key, data, ttl);
    } catch (error) {
      // Cache service not available, fail silently
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Update service metrics
   */
  private updateMetrics(type: 'start' | 'success' | 'error', startTime: number, duration?: number): void {
    if (!this.enableMetrics) return;

    const now = new Date();
    this.metrics.lastRequestTime = now;
    this.metrics.uptime = now.getTime() - this.startTime.getTime();

    if (type === 'start') {
      this.metrics.totalRequests++;
    } else if (type === 'success') {
      this.metrics.successfulRequests++;
      if (duration) {
        this.updateAverageResponseTime(duration);
      }
    } else if (type === 'error') {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(newDuration: number): void {
    const totalSuccessful = this.metrics.successfulRequests;
    if (totalSuccessful === 1) {
      this.metrics.averageResponseTime = newDuration;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (totalSuccessful - 1) + newDuration) / totalSuccessful;
    }
  }

  /**
   * Standardized logging with service context
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, extra?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] ${message}`;

    if (extra) {
      console.log(logMessage, extra);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Get current service metrics
   */
  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): {
    healthy: boolean;
    status: string;
    metrics: ServiceMetrics;
    uptime: number;
  } {
    const successRate = this.metrics.totalRequests > 0
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 0;

    const healthy = successRate >= 0.95; // Consider healthy if 95%+ success rate

    return {
      healthy,
      status: healthy ? 'healthy' : 'degraded',
      metrics: this.getMetrics(),
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Reset service metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      uptime: 0,
    };
    this.startTime = new Date();
    this.log('info', 'Service metrics reset');
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.log('info', `Shutting down ${this.serviceName} service`);
    // Override in subclasses for service-specific cleanup
  }

  /**
   * Service information
   */
  public getInfo(): {
    name: string;
    version: string;
    uptime: number;
    config: Partial<ServiceConfig>;
  } {
    return {
      name: this.serviceName,
      version: this.version,
      uptime: Date.now() - this.startTime.getTime(),
      config: {
        timeout: this.timeout,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        enableMetrics: this.enableMetrics,
        enableCaching: this.enableCaching,
      },
    };
  }
}

export default BaseService;
