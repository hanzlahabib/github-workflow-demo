// Test script for video generation
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:3000';

async function testVideoGeneration() {
  console.log('🎬 Testing ReelSpeed Video Generation...\n');

  // Test 1: Health Check
  console.log('1. Testing health endpoint...');
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Basic API Check
  console.log('\n2. Testing basic API endpoint...');
  try {
    const apiResponse = await fetch(`${API_BASE}/`);
    const apiData = await apiResponse.json();
    console.log('✅ API endpoint:', apiData);
  } catch (error) {
    console.log('❌ API endpoint failed:', error.message);
    return;
  }

  // Test 3: Check video routes (without auth for now)
  console.log('\n3. Testing video generation endpoint (without auth)...');
  try {
    const videoResponse = await fetch(`${API_BASE}/api/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text-story',
        input: {
          text: 'This is a test story for video generation',
          script: 'Hello, this is a test video script for ReelSpeed.ai testing'
        },
        settings: {
          voice: 'EXAVITQu4vr4xnSDxMaL', // Default voice
          language: 'en',
          background: 'default',
          template: 'default',
          hasWatermark: true,
          duration: 10
        }
      })
    });

    console.log('Video generation response status:', videoResponse.status);
    
    if (videoResponse.status === 401) {
      console.log('📝 Expected: Authentication required (normal behavior)');
    } else {
      const videoData = await videoResponse.text();
      console.log('Video generation response:', videoData);
    }
  } catch (error) {
    console.log('❌ Video generation test failed:', error.message);
  }

  console.log('\n🎯 Basic connectivity tests completed!');
  console.log('Next: Set up authentication and real API keys for full testing');
}

// Run the test
testVideoGeneration().catch(console.error);