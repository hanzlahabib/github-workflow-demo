/**
 * Test Video Generation Fix
 * 
 * Tests the configuration defaults fix for baseDelay error
 */

const { videoService } = require('./dist/services/videoService');

async function testVideoGenerationFix() {
  console.log('🎬 Testing Video Generation Fix...');
  
  const testRequest = {
    type: 'text-story',
    input: {
      config: {
        title: 'Configuration Test',
        messages: [
          { id: '1', sender: 'left', text: 'Testing configuration fix' },
          { id: '2', sender: 'right', text: 'Should work now with defaults!' }
        ],
        people: {
          left: { name: 'Alice' },
          right: { name: 'Bob' }
        },
        template: 'modern-light',
        backgroundSettings: {
          backgroundType: 'gradient',
          backgroundUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundOpacity: 100,
          backgroundBlur: false,
          musicVolume: 0
        }
      }
    },
    settings: { duration: 10 },
    userId: 'test-user'
  };
  
  try {
    console.log('🚀 Starting video generation with configuration defaults...');
    
    const result = await videoService.generateVideo(testRequest, (progress) => {
      console.log(`[${progress.phase}] ${progress.progress}% - ${progress.message}`);
    });
    
    if (result.success) {
      console.log('✅ VIDEO GENERATION SUCCESSFUL!');
      console.log('Result:', {
        outputPath: result.outputPath,
        sizeInMB: (result.sizeInBytes / 1024 / 1024).toFixed(2) + 'MB',
        durationInSeconds: result.durationInSeconds,
        renderTimeMs: result.renderTimeMs
      });
    } else {
      console.log('❌ Video generation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

// Run the test
if (require.main === module) {
  testVideoGenerationFix()
    .then(() => {
      console.log('\n✅ Video generation test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Video generation test failed:', error);
      process.exit(1);
    });
}

module.exports = { testVideoGenerationFix };