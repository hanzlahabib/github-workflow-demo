#!/usr/bin/env node

/**
 * Test script for simplified Lambda implementation
 * 
 * Tests the new Clippie-style Lambda service:
 * - Configuration loading
 * - Service initialization
 * - API endpoints
 * - Basic render flow
 */

const { lambdaConfig } = require('./dist/config/lambda.config');
const { simpleLambdaService } = require('./dist/services/simpleLambdaService');

console.log('🧪 Testing Simplified Lambda Implementation');
console.log('==========================================');

async function testConfiguration() {
  console.log('\n📋 Step 1: Testing Configuration');
  
  try {
    console.log('✅ Lambda config loaded:');
    console.log(`   Function: ${lambdaConfig.functionName}`);
    console.log(`   Region: ${lambdaConfig.region}`);
    console.log(`   Memory: ${lambdaConfig.memory}MB`);
    console.log(`   Timeout: ${lambdaConfig.timeout}s`);
    console.log(`   Site URL: ${lambdaConfig.siteUrl || 'Not configured'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
    return false;
  }
}

async function testServiceInitialization() {
  console.log('\n🔧 Step 2: Testing Service Initialization');
  
  try {
    const status = simpleLambdaService.getStatus();
    console.log('✅ Service status:');
    console.log(`   Available: ${status.available}`);
    console.log(`   Function: ${status.functionName}`);
    console.log(`   Region: ${status.region}`);
    console.log(`   Memory: ${status.memory}MB`);
    
    return status.available;
  } catch (error) {
    console.error('❌ Service initialization test failed:', error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Step 3: Testing API Endpoints');
  
  try {
    // Test if backend is running
    const response = await fetch('http://localhost:8001/health');
    if (!response.ok) {
      throw new Error(`Backend not running (${response.status})`);
    }
    
    console.log('✅ Backend is running');
    
    // Test Lambda status endpoint
    const statusResponse = await fetch('http://localhost:8001/api/lambda/status');
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Lambda status endpoint working:');
      console.log(`   Available: ${statusData.available}`);
    } else {
      console.log('⚠️  Lambda status endpoint not accessible');
    }
    
    return true;
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message);
    console.log('💡 Make sure backend is running: npm run dev');
    return false;
  }
}

async function testLambdaRender() {
  console.log('\n🎬 Step 4: Testing Lambda Render (if configured)');
  
  try {
    const status = simpleLambdaService.getStatus();
    
    if (!status.available) {
      console.log('⚠️  Lambda not configured, skipping render test');
      console.log('💡 Run deployment script first: npm run deploy-lambda');
      return true; // Not a failure, just not configured
    }
    
    console.log('✅ Lambda is configured, testing render...');
    
    // Create test request
    const testRequest = {
      id: `test-${Date.now()}`,
      inputProps: {
        conversations: [{
          id: '1',
          name: 'Test Chat',
          messages: [{
            id: '1',
            text: 'This is a test message for Lambda validation',
            from: 'sender',
            voiceId: 'default',
            duration: 2
          }],
          processedMessages: []
        }],
        messageMetadata: {
          username: 'Test User',
          darkMode: false,
          ui: 'iOS Dark'
        },
        durationInSeconds: 5,
        durationProp: 5
      },
      fileName: 'test-video.mp4',
      key: `test-renders/test-${Date.now()}.mp4`,
      videoId: `test-${Date.now()}`
    };
    
    // Start render
    console.log('   Starting test render...');
    const renderResult = await simpleLambdaService.startRender(testRequest);
    console.log(`   ✅ Render started: ${renderResult.renderId}`);
    
    // Check progress once
    console.log('   Checking initial progress...');
    const progress = await simpleLambdaService.getRenderProgress({
      id: renderResult.renderId,
      bucketName: renderResult.bucketName
    });
    console.log(`   ✅ Progress check successful: ${progress.type}`);
    
    return true;
  } catch (error) {
    console.error('❌ Lambda render test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive Lambda tests...\n');
  
  const results = {
    configuration: await testConfiguration(),
    service: await testServiceInitialization(),
    api: await testAPIEndpoints(),
    render: await testLambdaRender()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.charAt(0).toUpperCase() + test.slice(1)} Test`);
  });
  
  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Lambda implementation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. If Lambda not configured: npm run deploy-lambda');
  console.log('2. If backend not running: npm run dev');
  console.log('3. Test full video generation: npm run test-lambda-full');
  
  return allPassed;
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'all';

async function main() {
  try {
    switch (command) {
      case 'config':
        await testConfiguration();
        break;
      case 'service':
        await testServiceInitialization();
        break;
      case 'api':
        await testAPIEndpoints();
        break;
      case 'render':
        await testLambdaRender();
        break;
      case 'all':
      default:
        await runAllTests();
        break;
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}