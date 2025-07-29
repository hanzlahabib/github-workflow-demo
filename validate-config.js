#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Tests backend configuration and external service connectivity
 */

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

// Color output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testHttpEndpoint(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function validateConfig() {
  log('\n🔧 ReelSpeed Backend Configuration Validation', 'blue');
  log('=' .repeat(50), 'blue');

  // Test 1: Environment Variables
  log('\n1. Testing Environment Variables...', 'yellow');
  
  const requiredEnvVars = [
    'ELEVENLABS_API_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'STORAGE_PROVIDER'
  ];

  let envTestsPassed = 0;
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      log(`   ✅ ${envVar}: Present`, 'green');
      envTestsPassed++;
    } else {
      log(`   ❌ ${envVar}: Missing`, 'red');
    }
  }

  // Test 2: ElevenLabs API Key format
  log('\n2. Testing API Key Formats...', 'yellow');
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (elevenLabsKey && elevenLabsKey.startsWith('sk_')) {
    log('   ✅ ElevenLabs API Key: Valid format', 'green');
  } else {
    log('   ❌ ElevenLabs API Key: Invalid format (should start with sk_)', 'red');
  }

  // Test 3: Storage Configuration
  log('\n3. Testing Storage Configuration...', 'yellow');
  const storageProvider = process.env.STORAGE_PROVIDER;
  if (storageProvider === 'cloudflare') {
    log('   ✅ Storage Provider: Cloudflare R2', 'green');
    
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (r2PublicUrl) {
      log(`   ✅ R2 Public URL: ${r2PublicUrl}`, 'green');
    } else {
      log('   ⚠️  R2 Public URL: Not configured', 'yellow');
    }
  } else {
    log(`   ⚠️  Storage Provider: ${storageProvider || 'not set'}`, 'yellow');
  }

  // Test 4: Build Test
  log('\n4. Testing Backend Build...', 'yellow');
  try {
    execSync('npm run build', { cwd: __dirname, stdio: 'pipe' });
    log('   ✅ TypeScript Build: Success', 'green');
  } catch (error) {
    log('   ❌ TypeScript Build: Failed', 'red');
    log(`      Error: ${error.message}`, 'red');
  }

  // Test 5: Backend Server Test
  log('\n5. Testing Backend Server Startup...', 'yellow');
  let serverProcess;
  try {
    // Start server in background
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['dist/index.js'], { 
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server successfully started')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Error:') && !error.includes('⚠️')) {
          clearTimeout(timeout);
          reject(new Error(error));
        }
      });
    });

    log('   ✅ Backend Server: Started successfully', 'green');

    // Test health endpoint
    try {
      const response = await testHttpEndpoint('http://localhost:8001/health');
      if (response.status === 200) {
        log('   ✅ Health Endpoint: Responding', 'green');
      } else {
        log(`   ⚠️  Health Endpoint: Status ${response.status}`, 'yellow');
      }
    } catch (error) {
      log(`   ❌ Health Endpoint: ${error.message}`, 'red');
    }

  } catch (error) {
    log(`   ❌ Backend Server: ${error.message}`, 'red');
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  // Summary
  log('\n' + '=' .repeat(50), 'blue');
  log('📊 Configuration Validation Summary', 'blue');
  log(`   Environment Variables: ${envTestsPassed}/${requiredEnvVars.length} passed`, 
       envTestsPassed === requiredEnvVars.length ? 'green' : 'yellow');
  
  if (envTestsPassed === requiredEnvVars.length) {
    log('\n🎉 Backend configuration is valid and ready for deployment!', 'green');
  } else {
    log('\n⚠️  Some configuration issues found. Please review the errors above.', 'yellow');
  }
}

// Load environment variables
require('dotenv').config();

// Run validation
validateConfig().catch((error) => {
  log(`\n❌ Validation failed: ${error.message}`, 'red');
  process.exit(1);
});