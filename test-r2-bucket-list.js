/**
 * Test listing available R2 buckets
 */

const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testR2Buckets() {
  try {
    console.log('[R2 Buckets] Testing bucket access...');
    
    const s3Client = new S3Client({
      region: 'auto',
      credentials: {
        accessKeyId: 'f9cc095ccbecf50b6f6713121a23bd0b',
        secretAccessKey: '47713fe688b28be68e81a1b88e9d5060e3400a504900d16012998afa7a484800',
      },
      endpoint: 'https://9bea933aa07c0f1b14d09913fe64d48b.r2.cloudflarestorage.com',
      forcePathStyle: true,
    });

    // List available buckets
    console.log('[R2 Buckets] Listing available buckets...');
    const listCommand = new ListBucketsCommand({});
    const response = await s3Client.send(listCommand);
    
    console.log('✅ [R2 Buckets] Available buckets:');
    if (response.Buckets && response.Buckets.length > 0) {
      response.Buckets.forEach(bucket => {
        console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
      });
    } else {
      console.log('  No buckets found');
    }
    
  } catch (error) {
    console.error('❌ [R2 Buckets] Error:', error.message);
    if (error.name === 'CredentialsProviderError') {
      console.error('Check your R2 access credentials');
    } else if (error.$metadata?.httpStatusCode === 403) {
      console.error('Access denied - check permissions or endpoint');
    }
  }
}

testR2Buckets();