/**
 * Test Cloudflare R2 connection and configuration
 */

const { initializeConfig } = require('./dist/config/centralized.js');
const { createS3Service } = require('./dist/services/s3.js');

async function testR2Connection() {
  try {
    console.log('[R2 Test] Initializing configuration...');
    
    // Initialize configuration
    const { env, config } = initializeConfig();
    
    console.log('[R2 Test] Configuration loaded:');
    console.log('- Storage Provider:', config.backend.storage.provider);
    console.log('- R2 Endpoint:', config.backend.storage.cloudflare?.endpoint);
    console.log('- R2 Bucket:', config.backend.storage.cloudflare?.bucket);
    
    if (config.backend.storage.provider !== 'cloudflare') {
      throw new Error('Storage provider is not set to cloudflare');
    }
    
    if (!config.backend.storage.cloudflare) {
      throw new Error('Cloudflare R2 configuration is missing');
    }
    
    // Create S3 service (should work with R2)
    console.log('[R2 Test] Creating S3 service for R2...');
    const r2Config = {
      accessKeyId: config.backend.storage.cloudflare.accessKey,
      secretAccessKey: config.backend.storage.cloudflare.secretKey,
      region: 'auto',
      bucketName: config.backend.storage.cloudflare.bucket,
      endpoint: config.backend.storage.cloudflare.endpoint,
      forcePathStyle: true
    };
    
    console.log('[R2 Test] R2 Config:', {
      endpoint: r2Config.endpoint,
      bucket: r2Config.bucketName,
      region: r2Config.region,
      accessKeyId: r2Config.accessKeyId.substring(0, 8) + '...'
    });
    
    const s3Service = createS3Service(r2Config);
    
    // Test connection
    console.log('[R2 Test] Testing R2 connection...');
    const isConnected = await s3Service.testConnection();
    
    if (isConnected) {
      console.log('✅ [R2 Test] Connection successful!');
      
      // Test audio storage config
      console.log('[R2 Test] Testing audio storage configuration...');
      const { getAudioStorageConfig } = require('./dist/config/audioStorage.js');
      const audioConfig = getAudioStorageConfig();
      
      console.log('[R2 Test] Audio storage config:');
      console.log('- Environment:', process.env.NODE_ENV);
      console.log('- Bucket:', audioConfig.bucket);
      console.log('- ACL:', audioConfig.acl);
      console.log('- Retention:', audioConfig.retention);
      
    } else {
      console.log('❌ [R2 Test] Connection failed');
    }
    
  } catch (error) {
    console.error('❌ [R2 Test] Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testR2Connection();