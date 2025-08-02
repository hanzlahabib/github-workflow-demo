#!/usr/bin/env node

/**
 * Check progress of the test render
 */

require('dotenv').config();

async function checkProgress() {
  const { getRenderProgress } = require('@remotion/lambda');
  
  const renderId = 'mbutv87pr9'; // From the previous test
  const bucketName = process.env.LAMBDA_BUCKET_NAME;
  const functionName = process.env.LAMBDA_FUNCTION_NAME;
  const region = process.env.LAMBDA_REGION || 'us-east-1';
  
  console.log('🔍 Checking render progress...');
  console.log('Render ID:', renderId);
  
  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region,
    });
    
    console.log('\n📊 Progress Update:');
    console.log('Overall Progress:', Math.round(progress.overallProgress * 100) + '%');
    console.log('Chunks:', progress.chunks?.length || 'N/A');
    console.log('Costs:', progress.costs);
    console.log('Done:', progress.done);
    
    if (progress.done) {
      console.log('\n✅ Render Complete!');
      console.log('Output File:', progress.outputFile || 'N/A');
      console.log('Output Size:', progress.outputSizeInBytes || 'N/A');
    } else {
      console.log('\n⏳ Render In Progress...');
      console.log('Lambda function logs:', progress.cloudWatchLogs);
    }
    
  } catch (error) {
    console.error('❌ Error checking progress:', error.message);
  }
}

checkProgress();