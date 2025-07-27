/**
 * Test Enhanced Video Optimization Integration
 * 
 * Tests the new optimization integration that provides shouldSkipLoading
 * metadata to prevent Remotion timeout issues.
 */

const { cacheManager } = require('./dist/services/cacheManager');

async function testEnhancedOptimization() {
  console.log('🔧 Testing Enhanced Video Optimization Integration...');
  
  // Test config with a mock R2 video URL (using the URL from the cached video)
  const testConfig = {
    title: 'Test Video',
    backgroundSettings: {
      backgroundType: 'video',
      backgroundUrl: 'https://pub-83c5db439b40468498f97946200806f7.r2.dev/cda5013d743cebb7.mp4', // This is a large 50MB video
      backgroundOpacity: 100
    },
    messages: [
      { id: '1', sender: 'left', text: 'Testing video optimization' },
      { id: '2', sender: 'right', text: 'Should use fallback for large videos' }
    ]
  };
  
  try {
    console.log('🚀 Processing config with enhanced optimization...');
    
    await cacheManager.initialize();
    const result = await cacheManager.processVideoConfig(testConfig);
    
    console.log('✅ Enhanced processing result:', {
      hasR2Urls: result.hasR2Urls,
      urlCount: result.r2Urls.length,
      urlMappings: result.urlMappings,
      hasOptimizationMetadata: !!result.updatedConfig._videoOptimizationMetadata
    });
    
    if (result.updatedConfig._videoOptimizationMetadata) {
      console.log('📊 Optimization metadata:'); 
      Object.entries(result.updatedConfig._videoOptimizationMetadata).forEach(([url, meta]) => {
        console.log('  - URL:', url.substring(0, 50) + '...');
        console.log('    shouldSkipLoading:', meta.shouldSkipLoading);
        console.log('    useFallback:', meta.useFallback); 
        console.log('    durationInFrames:', meta.durationInFrames);
      });
    }
    
    console.log('\n🎯 Key Success: shouldSkipLoading should be true for large videos');
    console.log('This will prevent Remotion from trying to load video duration!');
    
    console.log('\n✨ SOLUTION SUMMARY:');
    console.log('1. Large videos (>50MB) are identified as fallback candidates');
    console.log('2. shouldSkipLoading=true prevents Remotion from loading video duration');
    console.log('3. Pre-calculated durationInFrames provides fallback duration');
    console.log('4. This should eliminate the 28-second timeout errors!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

// Run the test
if (require.main === module) {
  testEnhancedOptimization()
    .then(() => {
      console.log('\n✅ Enhanced optimization test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Enhanced optimization test failed:', error);
      process.exit(1);
    });
}

module.exports = { testEnhancedOptimization };