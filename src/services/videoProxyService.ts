/**
 * Video Proxy Service
 * 
 * Local HTTP server to serve cached R2 videos via localhost URLs
 * for Remotion rendering. This eliminates network requests during rendering.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createReadStream, existsSync } from 'fs';
import { stat, access, readdir } from 'fs/promises';
import path from 'path';
import { Server } from 'http';
import { EventEmitter } from 'events';
import mime from 'mime-types';

import type { CacheEntry } from '../types/videoCache';
import { ProxyError } from '../types/videoCache';
import { r2VideoCache } from './r2VideoCache';

interface ProxyRequest extends Request {
  startTime?: number;
}

interface ServeStats {
  totalRequests: number;
  totalBytesServed: number;
  averageResponseTimeMs: number;
  activeConnections: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
}

export class VideoProxyService extends EventEmitter {
  private app: express.Application;
  private server?: Server;
  private port: number;
  private cacheDirectory: string;
  private isRunning = false;
  private stats: ServeStats;
  private activeConnections = new Set<Response>();

  constructor(port: number = 3001, cacheDirectory?: string) {
    super();
    
    this.port = port;
    this.cacheDirectory = cacheDirectory || path.join(process.cwd(), 'temp', 'video-cache');
    this.app = express();
    
    this.stats = {
      totalRequests: 0,
      totalBytesServed: 0,
      averageResponseTimeMs: 0,
      activeConnections: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Request timing middleware
    this.app.use((req: ProxyRequest, res: Response, next: NextFunction) => {
      req.startTime = Date.now();
      this.stats.totalRequests++;
      
      // Track active connections
      this.activeConnections.add(res);
      this.stats.activeConnections = this.activeConnections.size;

      res.on('finish', () => {
        this.activeConnections.delete(res);
        this.stats.activeConnections = this.activeConnections.size;
        
        // Update response time stats
        if (req.startTime) {
          const responseTime = Date.now() - req.startTime;
          this.updateResponseTimeStats(responseTime);
        }
      });

      next();
    });

    // CORS for local development
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length');
      res.header('Access-Control-Expose-Headers', 'Content-Range, Content-Length');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      next();
    });

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[VideoProxy] ${req.method} ${req.url} - ${req.ip} - User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
      next();
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        stats: this.getStats(),
        cache: r2VideoCache.getCacheStats()
      });
    });

    // Video serving endpoint with range support
    this.app.get('/video/:filename', async (req: Request, res: Response) => {
      try {
        await this.serveVideo(req, res);
      } catch (error) {
        console.error('[VideoProxy] Error serving video:', error);
        this.stats.errors++;
        this.handleVideoError(res, error as Error);
      }
    });

    // Cache stats endpoint
    this.app.get('/cache/stats', (req: Request, res: Response) => {
      res.json({
        proxy: this.getStats(),
        cache: r2VideoCache.getCacheStats()
      });
    });

    // List cached videos endpoint
    this.app.get('/cache/list', (req: Request, res: Response) => {
      const entries = Array.from((r2VideoCache as any).cache.values())
        .map((entry: CacheEntry) => ({
          id: entry.id,
          originalUrl: entry.originalUrl.substring(0, 100) + (entry.originalUrl.length > 100 ? '...' : ''),
          localUrl: entry.localUrl,
          fileSizeBytes: entry.fileSizeBytes,
          status: entry.status,
          createdAt: entry.createdAt,
          lastAccessedAt: entry.lastAccessedAt,
          accessCount: entry.accessCount,
          tags: entry.tags
        }));

      res.json({
        totalEntries: entries.length,
        entries: entries.slice(0, 50) // Limit to 50 for performance
      });
    });

    // Serve video by cache ID
    this.app.get('/cache/:cacheId', async (req: Request, res: Response) => {
      try {
        const { cacheId } = req.params;
        const entries: CacheEntry[] = Array.from((r2VideoCache as any).cache.values());
        const entry = entries.find((entry: CacheEntry) => entry.id === cacheId);

        if (!entry) {
          res.status(404).json({ error: 'Cache entry not found' });
          return;
        }

        // Serve the cached video file
        const filename = path.basename(entry.localPath);
        req.params.filename = filename;
        await this.serveVideo(req, res);
        
      } catch (error) {
        console.error('[VideoProxy] Error serving cached video:', error);
        this.stats.errors++;
        this.handleVideoError(res, error as Error);
      }
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[VideoProxy] Unhandled error:', error);
      this.stats.errors++;
      
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    });
  }

  /**
   * Serve video file with range support for streaming
   */
  private async serveVideo(req: Request, res: Response): Promise<void> {
    const { filename } = req.params;
    const filePath = path.join(this.cacheDirectory, filename);

    console.log(`[VideoProxy] Attempting to serve video: ${filename}`);
    console.log(`[VideoProxy] Full file path: ${filePath}`);
    console.log(`[VideoProxy] Cache directory: ${this.cacheDirectory}`);

    // Check if file exists
    if (!existsSync(filePath)) {
      this.stats.cacheMisses++;
      console.error(`[VideoProxy] File not found: ${filePath}`);
      
      // List files in cache directory for debugging
      try {
        const files = await readdir(this.cacheDirectory);
        console.log(`[VideoProxy] Available files in cache directory:`, files);
      } catch (error) {
        console.error(`[VideoProxy] Failed to list cache directory:`, error);
      }
      
      res.status(404).json({ 
        error: 'Video not found',
        filename,
        path: filePath,
        cacheDirectory: this.cacheDirectory
      });
      return;
    }

    this.stats.cacheHits++;

    // Get file stats
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;
    
    // Determine content type
    const contentType = mime.lookup(filePath) || 'video/mp4';

    // Handle range requests for video streaming
    const range = req.headers.range;
    
    if (range) {
      await this.serveVideoRange(req, res, filePath, fileSize, contentType, range);
    } else {
      await this.serveVideoFull(req, res, filePath, fileSize, contentType);
    }

    // Update stats
    this.stats.totalBytesServed += fileSize;
    
    // Emit serve event
    this.emit('video_served', {
      filename,
      fileSize,
      contentType,
      hasRange: !!range,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
  }

  /**
   * Serve video with range support (for streaming)
   */
  private async serveVideoRange(
    req: Request, 
    res: Response, 
    filePath: string, 
    fileSize: number, 
    contentType: string, 
    range: string
  ): Promise<void> {
    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    // Validate range
    if (start >= fileSize || end >= fileSize) {
      res.status(416).set({
        'Content-Range': `bytes */${fileSize}`
      });
      res.end();
      return;
    }

    console.log(`[VideoProxy] Serving range ${start}-${end}/${fileSize} for ${path.basename(filePath)}`);

    // Set headers for partial content
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize.toString(),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Last-Modified': (await stat(filePath)).mtime.toUTCString()
    });

    // Create read stream for the range
    const stream = createReadStream(filePath, { start, end });
    
    // Handle stream errors
    stream.on('error', (error) => {
      console.error('[VideoProxy] Stream error:', error);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    // Pipe the stream to response
    stream.pipe(res);
  }

  /**
   * Serve full video file
   */
  private async serveVideoFull(
    req: Request, 
    res: Response, 
    filePath: string, 
    fileSize: number, 
    contentType: string
  ): Promise<void> {
    console.log(`[VideoProxy] Serving full video ${path.basename(filePath)} (${this.formatBytes(fileSize)})`);

    // Set headers for full content
    res.set({
      'Content-Length': fileSize.toString(),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Last-Modified': (await stat(filePath)).mtime.toUTCString()
    });

    // Create read stream
    const stream = createReadStream(filePath);
    
    // Handle stream errors
    stream.on('error', (error) => {
      console.error('[VideoProxy] Stream error:', error);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    // Pipe the stream to response
    stream.pipe(res);
  }

  /**
   * Handle video serving errors
   */
  private handleVideoError(res: Response, error: Error): void {
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to serve video',
        message: error.message
      });
    }
  }

  /**
   * Update response time statistics
   */
  private updateResponseTimeStats(responseTime: number): void {
    const totalRequests = this.stats.totalRequests;
    const currentAvg = this.stats.averageResponseTimeMs;
    
    // Calculate rolling average
    this.stats.averageResponseTimeMs = 
      ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  /**
   * Start the proxy server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[VideoProxy] Server already running on port ${this.port}`);
      return;
    }

    if (this.server && !this.server.listening) {
      console.log(`[VideoProxy] Server instance exists but not listening, cleaning up...`);
      try {
        this.server.close();
      } catch (error) {
        console.warn('[VideoProxy] Error cleaning up existing server:', error);
      }
      this.server = undefined;
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        this.isRunning = true;
        console.log(`[VideoProxy] Server started on http://localhost:${this.port}`);
        console.log(`[VideoProxy] Cache directory: ${this.cacheDirectory}`);
        console.log(`[VideoProxy] Health check: http://localhost:${this.port}/health`);
        
        this.emit('started', { port: this.port, cacheDirectory: this.cacheDirectory });
        resolve();
      });

      this.server.on('error', (error: Error & { code?: string }) => {
        console.error('[VideoProxy] Server error:', error);
        this.isRunning = false;
        
        if (error.code === 'EADDRINUSE') {
          console.error(`[VideoProxy] Port ${this.port} is already in use. Please free the port or use a different one.`);
          reject(new ProxyError(`Port ${this.port} is already in use`, undefined, error));
        } else {
          reject(new ProxyError('Failed to start proxy server', undefined, error));
        }
      });

      // Handle graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    });
  }

  /**
   * Stop the proxy server
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    console.log('[VideoProxy] Shutting down server...');

    return new Promise((resolve) => {
      // Close all active connections
      this.activeConnections.forEach(res => {
        if (!res.destroyed) {
          res.end();
        }
      });

      this.server!.close(() => {
        this.isRunning = false;
        console.log('[VideoProxy] Server shutdown complete');
        this.emit('shutdown');
        resolve();
      });

      // Force close after 5 seconds
      setTimeout(() => {
        if (this.isRunning) {
          console.warn('[VideoProxy] Force closing server');
          this.server!.closeAllConnections?.();
          this.isRunning = false;
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Get proxy server statistics
   */
  getStats(): ServeStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalBytesServed: 0,
      averageResponseTimeMs: 0,
      activeConnections: this.stats.activeConnections, // Keep current connections
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
    
    console.log('[VideoProxy] Statistics reset');
    this.emit('stats_reset');
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get cache directory
   */
  getCacheDirectory(): string {
    return this.cacheDirectory;
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
   * Test video serving functionality
   */
  async testVideoServing(filename: string): Promise<{
    success: boolean;
    responseTimeMs: number;
    fileSizeBytes: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const filePath = path.join(this.cacheDirectory, filename);
      
      // Check if file exists
      await access(filePath);
      const stats = await stat(filePath);
      
      // Simulate serving (just file system check)
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTimeMs: responseTime,
        fileSizeBytes: stats.size
      };
      
    } catch (error) {
      return {
        success: false,
        responseTimeMs: Date.now() - startTime,
        fileSizeBytes: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export singleton instance
export const videoProxyService = new VideoProxyService();