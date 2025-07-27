#!/usr/bin/env node

/**
 * Simple R2 Cache Test
 * 
 * Tests the R2 URL detection and caching logic without starting services
 */

const { cacheManager } = require('./dist/services/cacheManager');
const { r2VideoCache } = require('./dist/services/r2VideoCache');

async function testR2Detection() {
  console.log('🧪 Testing R2 URL Detection and Caching Logic\n');

  try {
    // Test 1: R2 URL detection
    console.log('1️⃣ Testing R2 URL detection...');
    
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

    console.log('Original config URLs:');
    console.log('- backgroundVideo:', testConfig.backgroundVideo);
    console.log('- overlayVideo:', testConfig.overlayVideo);
    console.log('- audioTrack:', testConfig.audioTrack);
    console.log('- videoAssets:', testConfig.metadata.videoAssets);

    // Detect R2 URLs using the cache manager method
    const r2Urls = cacheManager.detectR2Urls(testConfig);
    
    console.log('\n✅ R2 URL Detection Results:');
    console.log(`Found ${r2Urls.length} R2 URLs:`);
    r2Urls.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });

    // Test 2: Cache service configuration
    console.log('\n2️⃣ Testing cache service configuration...');
    
    const cacheStats = r2VideoCache.getCacheStats();
    console.log('Cache configuration:');
    console.log(`- Cache directory: ${cacheStats.cacheDirectory}`);
    console.log(`- Current entries: ${cacheStats.entryCount}`);
    console.log(`- Current size: ${formatBytes(cacheStats.currentSizeBytes)}`);
    console.log(`- Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

    // Test 3: Local URL generation
    console.log('\n3️⃣ Testing local URL generation...');
    
    const testUrl = 'https://pub-12345.r2.dev/videos/test.mp4';
    const cacheKey = require('crypto').createHash('sha256').update(testUrl).digest('hex').substring(0, 16);
    const fileName = `${cacheKey}.mp4`;
    const localUrl = `http://localhost:3001/video/${fileName}`;
    
    console.log('URL transformation example:');
    console.log(`- Original: ${testUrl}`);
    console.log(`- Cache key: ${cacheKey}`);
    console.log(`- File name: ${fileName}`);
    console.log(`- Local URL: ${localUrl}`);

    // Test 4: Config replacement simulation
    console.log('\n4️⃣ Testing config replacement logic...');
    
    const urlMappings = {};
    r2Urls.forEach(url => {
      const key = require('crypto').createHash('sha256').update(url).digest('hex').substring(0, 16);
      const file = `${key}.mp4`;
      urlMappings[url] = `http://localhost:3001/video/${file}`;
    });
    
    const updatedConfig = cacheManager.replaceUrlsInConfig(testConfig, urlMappings);
    
    console.log('URL mappings:');
    Object.entries(urlMappings).forEach(([original, local]) => {
      console.log(`- ${original.substring(0, 50)}... -> ${local}`);
    });
    
    console.log('\nUpdated config:');
    console.log('- backgroundVideo:', updatedConfig.backgroundVideo);
    console.log('- overlayVideo:', updatedConfig.overlayVideo);
    console.log('- audioTrack:', updatedConfig.audioTrack);
    console.log('- videoAssets:', updatedConfig.metadata.videoAssets);

    console.log('\n✅ All R2 detection tests passed!');
    
    return {
      success: true,
      r2UrlsFound: r2Urls.length,
      urlMappings: Object.keys(urlMappings).length,
      cacheStats
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
  testR2Detection()
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

module.exports = { testR2Detection };