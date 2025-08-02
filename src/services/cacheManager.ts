/**
 * Simplified Cache Manager
 * 
 * Basic cache management without complex R2 video cache dependencies
 */

export interface SimpleCacheStats {
  status: string;
  message: string;
  available: boolean;
}

export class SimpleCacheManager {
  private initialized = false;

  async initialize(): Promise<void> {
    console.log('[SimpleCacheManager] Initializing simplified cache system...');
    this.initialized = true;
    console.log('[SimpleCacheManager] Simplified cache system initialized');
  }

  getStats(): SimpleCacheStats {
    return {
      status: 'simplified',
      message: 'Cache system simplified for Lambda implementation',
      available: false
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Stub method for videoService compatibility
  async processVideoConfig(config: any): Promise<any> {
    console.log('[SimpleCacheManager] processVideoConfig called - returning original config (simplified)');
    return { config, cacheInfo: { hadR2Videos: false, cachedUrls: 0 } };
  }
}

// Singleton instance
export const cacheManager = new SimpleCacheManager();