#!/usr/bin/env node

/**
 * Test Lambda render cancellation
 * 
 * Demonstrates different ways to cancel a Lambda render
 */

console.log('🛑 Lambda Render Cancellation Test');
console.log('==================================');

async function testCancelViaAPI() {
  console.log('\n📡 Method 1: Cancel via API endpoint');
  
  try {
    // Check if backend is running
    const healthResponse = await fetch('http://localhost:8001/health');
    if (!healthResponse.ok) {
      throw new Error('Backend not running');
    }
    
    console.log('✅ Backend is running');
    console.log('💡 To cancel a render via API:');
    console.log('   DELETE /api/lambda/render/{renderId}');
    console.log('   Body: {"bucketName": "your-bucket-name"}');
    
    return true;
  } catch (error) {
    console.error('❌ API method not available:', error.message);
    return false;
  }
}

async function testCancelViaService() {
  console.log('\n🔧 Method 2: Cancel via SimpleLambdaService');
  
  try {
    const { simpleLambdaService } = require('./dist/services/simpleLambdaService');
    
    console.log('✅ SimpleLambdaService loaded');
    console.log('💡 Example usage:');
    console.log('   const result = await simpleLambdaService.cancelRender(renderId, bucketName);');
    console.log('   console.log(result.message);');
    
    return true;
  } catch (error) {
    console.error('❌ Service method not available:', error.message);
    return false;
  }
}

async function testCancelViaCLI() {
  console.log('\n⚡ Method 3: Cancel via AWS CLI/Remotion CLI');
  
  try {
    // Check if AWS CLI is available
    const { execSync } = require('child_process');
    execSync('aws --version', { stdio: 'ignore' });
    
    console.log('✅ AWS CLI available');
    console.log('💡 Command to cancel render:');
    console.log('   aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, \`remotion\`)].FunctionName"');
    console.log('   npx @remotion/lambda renders rm --region=us-east-1 --bucket-name=BUCKET --render-id=RENDER_ID');
    
    return true;
  } catch (error) {
    console.error('❌ CLI method not available:', error.message);
    return false;
  }
}

async function demonstrateCancelFlow() {
  console.log('\n🎬 Demonstration: Complete Cancel Flow');
  console.log('=====================================');
  
  console.log('1. Start a render:');
  console.log('   POST /api/lambda/render');
  console.log('   Response: {"renderId": "abc123", "bucketName": "..."}');
  
  console.log('\n2. Check progress:');
  console.log('   POST /api/lambda/progress');
  console.log('   Body: {"id": "abc123", "bucketName": "..."}');
  console.log('   Response: {"type": "progress", "progress": 0.45}');
  
  console.log('\n3. Cancel if needed:');
  console.log('   DELETE /api/lambda/render/abc123');
  console.log('   Body: {"bucketName": "..."}');
  console.log('   Response: {"success": true, "message": "Render cancelled successfully"}');
  
  console.log('\n⚠️  Note: Cancelled renders may still incur some AWS costs for partial execution.');
}

async function listActiveRenders() {
  console.log('\n📋 Check for Active Renders');
  
  try {
    const { execSync } = require('child_process');
    
    console.log('🔍 Checking for active Lambda functions...');
    const result = execSync('aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, \`remotion\`)].{Name:FunctionName,State:State}" --output table', 
      { encoding: 'utf8' });
    
    console.log(result);
    
    console.log('💡 To see active renders, check CloudWatch logs or S3 renders/ folder');
    
  } catch (error) {
    console.log('⚠️  Could not check active renders via CLI');
    console.log('💡 Alternative: Check AWS Console → Lambda → Functions → CloudWatch Logs');
  }
}

async function main() {
  const results = await Promise.all([
    testCancelViaAPI(),
    testCancelViaService(), 
    testCancelViaCLI()
  ]);
  
  await demonstrateCancelFlow();
  await listActiveRenders();
  
  console.log('\n📊 Cancellation Methods Available:');
  console.log(`   API Endpoint: ${results[0] ? '✅' : '❌'}`);
  console.log(`   Service Code: ${results[1] ? '✅' : '❌'}`);
  console.log(`   CLI Tools:    ${results[2] ? '✅' : '❌'}`);
  
  console.log('\n🎯 Recommended Approach:');
  console.log('   1. Use API endpoint for frontend integration');
  console.log('   2. Use service code for backend logic');
  console.log('   3. Use CLI for manual intervention/debugging');
  
  console.log('\n⚡ Quick Test Commands:');
  console.log('   npm run test-lambda        # Test full system');
  console.log('   npm run build && npm run dev # Start backend');
  console.log('   curl -X POST http://localhost:8001/api/lambda/test # Start test render');
}

if (require.main === module) {
  main().catch(console.error);
}