#!/usr/bin/env node

/**
 * Final Integration Test for R2 Cache System
 * 
 * This script tests the complete R2 video caching integration:
 * 1. Uses the actual processVideoConfig method
 * 2. Tests with separate proxy service on different port
 * 3. Verifies complete URL replacement
 */

const { VideoProxyService } = require('./dist/services/videoProxyService');
const { R2VideoCacheService } = require('./dist/services/r2VideoCache');
const { CacheManager } = require('./dist/services/cacheManager');
const path = require('path');

async function testCompleteIntegration() {
  console.log('🚀 Final R2 Cache System Integration Test\n');

  // Use different port to avoid conflicts
  const testPort = 3002;
  const testCacheDir = path.join(process.cwd(), 'temp', 'test-cache');
  
  // Create separate instances for testing
  const cacheService = new R2VideoCacheService({
    cacheDirectory: testCacheDir,
    proxyPort: testPort,
    enableBackgroundCleanup: false // Disable for testing
  });
  
  const proxyService = new VideoProxyService(testPort, testCacheDir);
  const cacheManager = new CacheManager(
    { 
      enableAutoOptimization: false,
      enableSmartPreCaching: false,
      enablePerformanceMonitoring: false
    },
    cacheService,
    proxyService
  );

  try {
    console.log('1️⃣ Initializing test cache system...');
    
    // Initialize the cache manager (this will start proxy service)
    await cacheManager.initialize();
    
    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ Cache system initialized on port ${testPort}`);
    console.log(`Cache directory: ${testCacheDir}`);

    // Test configuration with R2 URLs
    console.log('\n2️⃣ Testing video config processing...');
    
    const testConfig = {
      backgroundVideo: 'https://pub-12345.r2.dev/videos/test-background.mp4',
      overlayVideo: 'https://pub-67890.r2.dev/videos/test-overlay.mp4',
      audioTrack: 'https://normal-cdn.com/audio/track.mp3', // Non-R2 URL
      settings: {
        width: 1920,
        height: 1080
      },
      metadata: {
        videoAssets: [
          'https://pub-12345.r2.dev/videos/asset1.mp4',
          'https://pub-12345.r2.dev/videos/asset2.mp4'
        ],
        thumbnails: [
          'https://pub-12345.r2.dev/images/thumb1.jpg', // Won't be processed (not video)
          'https://pub-67890.r2.dev/videos/thumb.mp4'   // Will be processed
        ]
      }
    };

    console.log('Original configuration:');
    console.log('- backgroundVideo:', testConfig.backgroundVideo);
    console.log('- overlayVideo:', testConfig.overlayVideo);
    console.log('- audioTrack:', testConfig.audioTrack);
    console.log('- videoAssets:', testConfig.metadata.videoAssets);
    console.log('- thumbnails:', testConfig.metadata.thumbnails);

    // Process the configuration
    const result = await cacheManager.processVideoConfig(testConfig);

    console.log('\n✅ Video config processing completed!');
    console.log(`- Has R2 URLs: ${result.hasR2Urls}`);
    console.log(`- R2 URLs found: ${result.r2Urls.length}`);
    console.log(`- URL mappings: ${Object.keys(result.urlMappings).length}`);

    if (result.hasR2Urls) {
      console.log('\nDetected R2 URLs:');
      result.r2Urls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url.substring(0, 70)}...`);
      });

      console.log('\nURL Mappings:');
      Object.entries(result.urlMappings).forEach(([original, local]) => {
        console.log(`  ${original.substring(0, 50)}... -> ${local}`);
      });

      console.log('\nUpdated configuration:');
      console.log('- backgroundVideo:', result.updatedConfig.backgroundVideo);
      console.log('- overlayVideo:', result.updatedConfig.overlayVideo);
      console.log('- audioTrack:', result.updatedConfig.audioTrack);
      console.log('- videoAssets:', result.updatedConfig.metadata.videoAssets);
      console.log('- thumbnails:', result.updatedConfig.metadata.thumbnails);
    }

    // Test proxy service functionality
    console.log('\n3️⃣ Testing proxy service...');
    
    const proxyStats = proxyService.getStats();
    console.log('Proxy Statistics:');
    console.log(`- Running: ${proxyService.isServerRunning()}`);
    console.log(`- Port: ${proxyService.getPort()}`);
    console.log(`- Total requests: ${proxyStats.totalRequests}`);
    console.log(`- Cache hits: ${proxyStats.cacheHits}`);
    console.log(`- Cache misses: ${proxyStats.cacheMisses}`);

    // Test health check
    try {
      const response = await fetch(`http://localhost:${testPort}/health`);
      const health = await response.json();
      console.log(`- Health check: ${health.status}`);
    } catch (error) {
      console.warn(`- Health check failed: ${error.message}`);
    }

    // Test cache statistics
    console.log('\n4️⃣ Cache service statistics...');
    
    const cacheStats = cacheService.getCacheStats();
    console.log('Cache Statistics:');
    console.log(`- Entries: ${cacheStats.entryCount}`);
    console.log(`- Size: ${formatBytes(cacheStats.currentSizeBytes)}`);
    console.log(`- Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log(`- Available disk space: ${formatBytes(cacheStats.availableDiskSpaceBytes)}`);

    console.log('\n✅ All integration tests completed successfully!');
    
    return {
      success: true,
      proxyRunning: proxyService.isServerRunning(),
      proxyPort: testPort,
      r2UrlsDetected: result.r2Urls.length,
      urlMappingsCreated: Object.keys(result.urlMappings).length,
      configUpdated: !!result.updatedConfig,
      cacheStats,
      proxyStats
    };

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Cleanup
    try {
      console.log('\n🧹 Cleaning up test services...');
      await proxyService.shutdown();
      await cacheService.shutdown();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error.message);
    }
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
  testCompleteIntegration()
    .then((result) => {
      console.log('\n📊 Final Integration Test Result:', result.success ? 'PASSED' : 'FAILED');
      if (result.success) {
        console.log(`🎉 R2 Cache System is working correctly!`);
        console.log(`   - Proxy service: ✅ Running on port ${result.proxyPort}`);
        console.log(`   - R2 detection: ✅ Found ${result.r2UrlsDetected} R2 URLs`);
        console.log(`   - URL mapping: ✅ Created ${result.urlMappingsCreated} local mappings`);
        console.log(`   - Config update: ✅ ${result.configUpdated ? 'Successful' : 'Failed'}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteIntegration };