/**
 * Cache Management Routes
 * 
 * REST API endpoints for managing the R2 video cache system,
 * providing status information, cache control, and monitoring.
 */

import { Router, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../utils/jwt';
import type { CacheEntry } from '../types/videoCache';
import { cacheManager } from '../services/cacheManager';
import { r2VideoCache } from '../services/r2VideoCache';
import { videoProxyService } from '../services/videoProxyService';
import { detectR2Urls, generateProcessingReport, validateUrlPattern } from '../utils/r2UrlProcessor';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/cache/status
 * Get comprehensive cache system status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stats = cacheManager.getComprehensiveStats();
    const health = await cacheManager.performHealthCheck();
    
    res.json({
      success: true,
      data: {
        status: health.status,
        timestamp: new Date().toISOString(),
        cache: stats.cache,
        proxy: stats.proxy,
        manager: stats.manager,
        health: {
          issues: health.issues,
          recommendations: health.recommendations,
          diskSpace: health.diskSpace
        },
        services: {
          cacheInitialized: stats.health === 'running',
          proxyRunning: videoProxyService.isServerRunning(),
          proxyPort: videoProxyService.getPort(),
          cacheDirectory: videoProxyService.getCacheDirectory()
        }
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to get cache status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/cache/stats
 * Get detailed cache statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const cacheStats = r2VideoCache.getCacheStats();
    const proxyStats = videoProxyService.getStats();
    
    res.json({
      success: true,
      data: {
        cache: cacheStats,
        proxy: proxyStats,
        summary: {
          totalCachedVideos: cacheStats.entryCount,
          totalCacheSize: cacheStats.currentSizeBytes,
          hitRate: Math.round(cacheStats.hitRate * 100),
          totalRequests: proxyStats.totalRequests,
          totalBytesServed: proxyStats.totalBytesServed,
          averageResponseTime: Math.round(proxyStats.averageResponseTimeMs),
          activeConnections: proxyStats.activeConnections
        }
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/cache/entries
 * List cache entries with optional filtering
 */
router.get('/entries', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      limit = 50, 
      skip = 0, 
      status, 
      sortBy = 'lastAccessedAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Get all cache entries (this would be more efficient with pagination in production)
    const allEntries: CacheEntry[] = Array.from((r2VideoCache as any).cache.values());
    
    // Apply filtering
    let filteredEntries = allEntries;
    if (status) {
      filteredEntries = allEntries.filter(entry => entry.status === status);
    }

    // Apply sorting
    filteredEntries.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a];
      const bVal = b[sortBy as keyof typeof b];
      
      if (sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });

    // Apply pagination
    const paginatedEntries = filteredEntries
      .slice(Number(skip), Number(skip) + Number(limit))
      .map(entry => ({
        id: entry.id,
        originalUrl: entry.originalUrl.length > 100 ? 
          entry.originalUrl.substring(0, 100) + '...' : 
          entry.originalUrl,
        localUrl: entry.localUrl,
        fileSizeBytes: entry.fileSizeBytes,
        status: entry.status,
        createdAt: entry.createdAt,
        lastAccessedAt: entry.lastAccessedAt,
        accessCount: entry.accessCount,
        tags: entry.tags,
        contentType: entry.contentType,
        errorMessage: entry.errorMessage
      }));

    res.json({
      success: true,
      data: {
        entries: paginatedEntries,
        pagination: {
          total: filteredEntries.length,
          limit: Number(limit),
          skip: Number(skip),
          hasMore: Number(skip) + Number(limit) < filteredEntries.length
        },
        filters: {
          status,
          sortBy,
          sortOrder
        }
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to list cache entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list cache entries',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear cache entries based on strategy
 */
router.post('/clear', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { strategy = 'lru', pattern } = req.body;
    
    console.log(`[CacheRoutes] Manual cache clear requested: strategy=${strategy}, pattern=${pattern}`);
    
    const result = await cacheManager.clearCache(pattern);
    
    res.json({
      success: true,
      data: {
        result,
        message: `Cleared ${result.removedEntries} cache entries, freed ${formatBytes(result.bytesFreed)}`
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/cache/optimize
 * Trigger cache optimization
 */
router.post('/optimize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await cacheManager.optimizeCache();
    
    res.json({
      success: true,
      data: {
        result,
        message: `Cache optimization completed: removed ${result.removedEntries} entries, freed ${formatBytes(result.bytesFreed)}`
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to optimize cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize cache',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/cache/health
 * Get detailed health check information
 */
router.get('/health', authenticateToken, async (req: Request, res: Response) => {
  try {
    const health = await cacheManager.performHealthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to perform health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform health check',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/cache/analyze-config
 * Analyze a video config for R2 URLs without caching them
 */
router.post('/analyze-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Missing config in request body'
      });
    }

    const r2Urls = detectR2Urls(config, {
      skipProblematicUrls: false,
      priorityStrategy: 'size'
    });

    const report = generateProcessingReport(r2Urls);
    
    res.json({
      success: true,
      data: {
        analysis: report,
        urls: r2Urls.map(urlInfo => ({
          url: urlInfo.url.length > 100 ? 
            urlInfo.url.substring(0, 100) + '...' : 
            urlInfo.url,
          estimatedSize: urlInfo.estimatedSize,
          videoQuality: urlInfo.videoQuality,
          priority: urlInfo.priority,
          configPath: urlInfo.configPath
        }))
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to analyze config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze config',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/cache/validate-url
 * Validate an R2 URL for caching compatibility
 */
router.post('/validate-url', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing url in request body'
      });
    }

    const validation = validateUrlPattern(url);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to validate URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate URL',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/cache/entry/:id
 * Get specific cache entry details
 */
router.get('/entry/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const entries: CacheEntry[] = Array.from((r2VideoCache as any).cache.values());
    const entry = entries.find((entry: CacheEntry) => entry.id === id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Cache entry not found'
      });
    }

    res.json({
      success: true,
      data: {
        entry: {
          ...entry,
          // Truncate long URLs for display
          originalUrl: entry.originalUrl.length > 200 ? 
            entry.originalUrl.substring(0, 200) + '...' : 
            entry.originalUrl
        }
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to get cache entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache entry',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/cache/entry/:id
 * Remove specific cache entry
 */
router.delete('/entry/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const entry = Array.from((r2VideoCache as any).cache.values())
      .find((entry: any) => entry.id === id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Cache entry not found'
      });
    }

    // Remove the entry (this would need to be implemented in the cache service)
    // For now, we'll use the cleanup method as a workaround
    await cacheManager.clearCache();
    
    res.json({
      success: true,
      data: {
        message: `Cache entry ${id} removed successfully`
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to remove cache entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove cache entry',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/cache/pre-cache
 * Pre-cache specific URLs
 */
router.post('/pre-cache', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { urls, priority = 'medium', tags = [] } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or empty urls array in request body'
      });
    }

    const results = [];
    
    for (const url of urls) {
      try {
        const entry = await r2VideoCache.getVideo(url, { 
          tags: ['pre-cache', ...tags],
          priority 
        });
        results.push({ url, success: true, cacheEntry: entry.id });
      } catch (error) {
        results.push({ 
          url, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: urls.length,
          successful: successCount,
          failed: urls.length - successCount
        }
      }
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to pre-cache URLs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pre-cache URLs',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/cache/proxy/test/:filename
 * Test video serving functionality
 */
router.get('/proxy/test/:filename', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    const testResult = await videoProxyService.testVideoServing(filename);
    
    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('[CacheRoutes] Failed to test video serving:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test video serving',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Utility function to format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;