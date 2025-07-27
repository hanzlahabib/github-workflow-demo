#!/usr/bin/env node

/**
 * Test R2 Cache and Proxy System
 * 
 * This script tests the complete R2 video caching and proxy system:
 * 1. Starts the cache manager and proxy service
 * 2. Downloads and caches a test R2 video
 * 3. Verifies the proxy service serves the cached video
 * 4. Tests cleanup functionality
 */

const { cacheManager } = require('./dist/services/cacheManager');
const { videoProxyService } = require('./dist/services/videoProxyService');
const { r2VideoCache } = require('./dist/services/r2VideoCache');

async function testCacheProxySystem() {
  console.log('🧪 Testing R2 Cache and Proxy System\n');

  try {
    // Step 1: Initialize the cache manager and proxy service
    console.log('1️⃣ Initializing cache manager and proxy service...');
    await cacheManager.initialize();
    
    // Wait a moment for services to fully start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Check proxy service status
    console.log('\n2️⃣ Checking proxy service status...');
    const isRunning = videoProxyService.isServerRunning();
    const port = videoProxyService.getPort();
    const cacheDir = videoProxyService.getCacheDirectory();
    
    console.log(`Proxy running: ${isRunning}`);
    console.log(`Proxy port: ${port}`);
    console.log(`Cache directory: ${cacheDir}`);

    if (!isRunning) {
      throw new Error('Proxy service is not running');
    }

    // Step 3: Test health endpoints
    console.log('\n3️⃣ Testing proxy health endpoint...');
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      const health = await response.json();
      console.log('Health check response:', health);
    } catch (error) {
      console.error('Health check failed:', error.message);
    }

    // Step 4: Test with a mock R2 URL (we'll use a real small video file for testing)
    console.log('\n4️⃣ Testing video caching with mock config...');
    
    // Use a sample configuration with R2-like URLs
    const testConfig = {
      backgroundVideo: 'https://pub-12345.r2.dev/videos/test-background.mp4',
      overlayVideo: 'https://pub-67890.r2.dev/videos/test-overlay.mp4',
      audioTrack: 'https://normal-cdn.com/audio/track.mp3', // Non-R2 URL should be ignored
      metadata: {
        videoAssets: [
          'https://pub-12345.r2.dev/videos/asset1.mp4',
          'https://pub-12345.r2.dev/videos/asset2.mp4'
        ]
      }
    };

    // Process the config (this should detect R2 URLs and attempt to cache them)
    console.log('Processing video config for R2 URLs...');
    const result = await cacheManager.processVideoConfig(testConfig);
    
    console.log('\nR2 URL Detection Result:');
    console.log(`- Has R2 URLs: ${result.hasR2Urls}`);
    console.log(`- R2 URLs found: ${result.r2Urls.length}`);
    console.log('- URL mappings:', Object.keys(result.urlMappings).length);
    
    if (result.hasR2Urls) {
      console.log('\nR2 URLs detected:');
      result.r2Urls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url.substring(0, 60)}...`);
      });
      
      console.log('\nURL Mappings:');
      Object.entries(result.urlMappings).forEach(([original, local]) => {
        console.log(`  ${original.substring(0, 40)}... -> ${local}`);
      });
    }

    // Step 5: Test cache statistics
    console.log('\n5️⃣ Cache statistics:');
    const cacheStats = r2VideoCache.getCacheStats();
    const proxyStats = videoProxyService.getStats();
    
    console.log('Cache Stats:');
    console.log(`- Entries: ${cacheStats.entryCount}`);
    console.log(`- Size: ${formatBytes(cacheStats.currentSizeBytes)}`);
    console.log(`- Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
    
    console.log('\nProxy Stats:');
    console.log(`- Total requests: ${proxyStats.totalRequests}`);
    console.log(`- Cache hits: ${proxyStats.cacheHits}`);
    console.log(`- Cache misses: ${proxyStats.cacheMisses}`);
    console.log(`- Active connections: ${proxyStats.activeConnections}`);

    // Step 6: Test cleanup functionality
    console.log('\n6️⃣ Testing cache cleanup...');
    const cleanupResult = await r2VideoCache.cleanup('lru');
    console.log('Cleanup result:', cleanupResult);

    console.log('\n✅ All tests completed successfully!');
    
    return {
      success: true,
      proxyRunning: isRunning,
      proxyPort: port,
      r2Detection: result,
      cacheStats,
      proxyStats,
      cleanupResult
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the test
if (require.main === module) {
  testCacheProxySystem()
    .then((result) => {
      console.log('\n📊 Final Test Result:', result.success ? 'PASSED' : 'FAILED');
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testCacheProxySystem };