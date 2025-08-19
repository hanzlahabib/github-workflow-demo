#!/usr/bin/env node

/**
 * Simple Lambda Service Test
 * Tests the current Lambda service without full backend compilation
 */

require('dotenv').config();

// Test if we can import and initialize the Lambda service
async function testLambdaService() {
  console.log('🧪 Simple Lambda Service Test');
  console.log('=====================================');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('LAMBDA_FUNCTION_NAME:', process.env.LAMBDA_FUNCTION_NAME || 'NOT SET');
  console.log('LAMBDA_REGION:', process.env.LAMBDA_REGION || 'NOT SET');
  console.log('LAMBDA_BUCKET_NAME:', process.env.LAMBDA_BUCKET_NAME || 'NOT SET');
  console.log('LAMBDA_SITE_URL:', process.env.LAMBDA_SITE_URL || 'NOT SET');
  
  // Test if we can access the Lambda functions
  try {
    console.log('\n🔍 Testing Lambda Function Access...');
    const { getFunctions } = require('@remotion/lambda');
    
    const functions = await getFunctions({
      region: process.env.LAMBDA_REGION || 'us-east-1',
    });
    
    console.log('✅ Successfully retrieved Lambda functions:');
    functions.forEach(func => {
      console.log(`  - ${func.functionName} (${func.memorySizeInMb}MB, ${func.timeoutInSeconds}s)`);
    });
    
  } catch (error) {
    console.log('❌ Failed to access Lambda functions:', error.message);
  }
  
  // Test site access
  try {
    console.log('\n🌐 Testing Site Access...');
    const siteUrl = process.env.LAMBDA_SITE_URL;
    if (!siteUrl) {
      console.log('❌ No site URL configured');
      return;
    }
    
    const response = await fetch(siteUrl);
    if (response.ok) {
      console.log('✅ Site is accessible');
      console.log('   Status:', response.status);
      console.log('   Content-Type:', response.headers.get('content-type'));
    } else {
      console.log('❌ Site not accessible:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.log('❌ Failed to access site:', error.message);
  }
  
  // Test simple video generation (without full backend)
  try {
    console.log('\n🎬 Testing Video Generation...');
    
    if (!process.env.LAMBDA_FUNCTION_NAME || !process.env.LAMBDA_SITE_URL) {
      console.log('❌ Missing required configuration for video generation test');
      return;
    }
    
    const { renderMediaOnLambda } = require('@remotion/lambda');
    
    console.log('   Initiating test render...');
    const result = await renderMediaOnLambda({
      region: process.env.LAMBDA_REGION || 'us-east-1',
      functionName: process.env.LAMBDA_FUNCTION_NAME,
      composition: 'CleanTextStory', // Default composition
      serveUrl: process.env.LAMBDA_SITE_URL,
      codec: 'h264',
      inputProps: {
        messages: [
          { id: '1', text: 'Hello world!', sender: 'left' },
          { id: '2', text: 'This is a test', sender: 'right' }
        ]
      },
      privacy: 'public',
      maxRetries: 1,
      framesPerLambda: 8,
    });
    
    console.log('✅ Video generation initiated successfully!');
    console.log('   Render ID:', result.renderId);
    console.log('   Bucket:', result.bucketName);
    console.log('   CloudWatch URL:', result.cloudWatchLogs);
    
    // Test progress monitoring
    console.log('\n📊 Testing Progress Monitoring...');
    const { getRenderProgress } = require('@remotion/lambda');
    
    const progress = await getRenderProgress({
      renderId: result.renderId,
      bucketName: result.bucketName,
      functionName: process.env.LAMBDA_FUNCTION_NAME,
      region: process.env.LAMBDA_REGION || 'us-east-1',
    });
    
    console.log('✅ Progress monitoring works!');
    console.log('   Progress:', progress.overallProgress);
    console.log('   Costs:', progress.costs);
    
  } catch (error) {
    console.log('❌ Video generation test failed:', error.message);
    if (error.message.includes('AccessDenied')) {
      console.log('   This might be due to AWS permissions or configuration issues');
    }
  }
  
  console.log('\n🏁 Test Complete');
}

// Run the test
testLambdaService().catch(console.error);