/**
 * Simple test script to verify caching performance
 * Run with: node test-cache.js
 */

const axios = require('axios');

async function testVoiceListPerformance() {
  const baseUrl = 'http://localhost:3000/api/voices';
  
  console.log('🧪 Testing Voice List Caching Performance...\n');
  
  try {
    // Test 1: First request (cache miss)
    console.log('📝 Test 1: First request (should be cache miss)');
    const start1 = Date.now();
    const response1 = await axios.get(`${baseUrl}/list`, {
      headers: {
        'Authorization': 'Bearer test-token' // You might need to adjust this
      }
    });
    const time1 = Date.now() - start1;
    console.log(`✅ First request: ${time1}ms (${response1.data.voices?.length || 0} voices)`);
    
    // Test 2: Second request (should be cache hit)
    console.log('\n📝 Test 2: Second request (should be cache hit)');
    const start2 = Date.now();
    const response2 = await axios.get(`${baseUrl}/list`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    const time2 = Date.now() - start2;
    console.log(`✅ Second request: ${time2}ms (${response2.data.voices?.length || 0} voices)`);
    
    // Test 3: Third request (should also be cache hit)
    console.log('\n📝 Test 3: Third request (should also be cache hit)');
    const start3 = Date.now();
    const response3 = await axios.get(`${baseUrl}/list`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    const time3 = Date.now() - start3;
    console.log(`✅ Third request: ${time3}ms (${response3.data.voices?.length || 0} voices)`);
    
    // Performance Analysis
    console.log('\n📊 Performance Analysis:');
    console.log(`🔥 Cache miss time: ${time1}ms`);
    console.log(`⚡ Cache hit time: ${time2}ms`);
    console.log(`⚡ Cache hit time: ${time3}ms`);
    console.log(`🚀 Speed improvement: ${Math.round((time1 / time2) * 100) / 100}x faster`);
    
    // Test cache stats
    console.log('\n📝 Test 4: Cache statistics');
    try {
      const statsResponse = await axios.get(`${baseUrl}/cache/stats`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      console.log('📈 Cache Stats:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️ Cache stats not available (endpoint may not exist)');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Network Error: Server not responding. Make sure backend is running on port 3000');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run the test
testVoiceListPerformance();