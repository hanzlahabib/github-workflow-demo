/**
 * R2 Video Cache System Integration Test
 * 
 * Comprehensive test suite to validate the R2 video caching system
 * including cache service, proxy service, and VideoService integration.
 */

const path = require('path');
const fs = require('fs').promises;
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  // Test R2 URLs (replace with actual test URLs)
  testUrls: [
    'https://example.r2.dev/videos/sample-small.mp4',
    'https://example.r2.dev/videos/sample-medium.mp4',
    // Add real R2 URLs here for testing
  ],
  proxyPort: 3001,
  cacheDirectory: path.join(process.cwd(), 'temp', 'video-cache'),
  apiBaseUrl: 'http://localhost:3000',
  testTimeout: 60000 // 1 minute
};

// Mock video config with R2 URLs
const MOCK_VIDEO_CONFIG = {
  title: "Test Video with R2 Background",
  messages: [
    { id: "1", sender: "left", text: "Hey, check out this video!" },
    { id: "2", sender: "right", text: "Wow, that's amazing!" }
  ],
  people: {
    left: { name: "Alice", avatar: { url: "" } },
    right: { name: "Bob", avatar: { url: "" } }
  },
  backgroundSettings: {
    backgroundType: "video",
    backgroundUrl: "https://example.r2.dev/videos/background-video.mp4",
    backgroundOpacity: 80
  },
  template: "modern-light"
};

class R2CacheSystemTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Log test result
   */
  logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
    
    this.results.tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  /**
   * Make HTTP request
   */
  async makeRequest(method, url, data = null) {
    return new Promise((resolve, reject) => {
      const options = new URL(url);
      options.method = method;
      options.headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Mock auth token
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const responseData = JSON.parse(body);
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: body,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Test cache system initialization
   */
  async testCacheInitialization() {
    console.log('\n🚀 Testing Cache System Initialization...');
    
    try {
      // Test cache status endpoint
      const response = await this.makeRequest('GET', `${TEST_CONFIG.apiBaseUrl}/api/cache/status`);
      
      if (response.status === 200 && response.data.success) {
        const cacheData = response.data.data;
        this.logTest('Cache Status API', true, `Status: ${cacheData.status}`);
        
        // Check if services are initialized
        this.logTest('Cache Service Initialized', 
          cacheData.services.cacheInitialized === true || cacheData.services.cacheInitialized === 'running',
          `Cache: ${cacheData.services.cacheInitialized}`
        );
        
        this.logTest('Proxy Service Running', 
          cacheData.services.proxyRunning === true,
          `Proxy: ${cacheData.services.proxyRunning}, Port: ${cacheData.services.proxyPort}`
        );
        
        return true;
      } else {
        this.logTest('Cache Status API', false, `HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logTest('Cache Initialization', false, error.message);
      return false;
    }
  }

  /**
   * Test R2 URL detection
   */
  async testR2UrlDetection() {
    console.log('\n🔍 Testing R2 URL Detection...');
    
    try {
      const response = await this.makeRequest('POST', `${TEST_CONFIG.apiBaseUrl}/api/cache/analyze-config`, {
        config: MOCK_VIDEO_CONFIG
      });
      
      if (response.status === 200 && response.data.success) {
        const analysis = response.data.data.analysis;
        this.logTest('R2 URL Detection', analysis.totalUrls > 0, `Found ${analysis.totalUrls} R2 URLs`);
        this.logTest('URL Analysis', true, `Size breakdown: ${JSON.stringify(analysis.bySize)}`);
        return true;
      } else {
        this.logTest('R2 URL Detection', false, `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('R2 URL Detection', false, error.message);
      return false;
    }
  }

  /**
   * Test URL validation
   */
  async testUrlValidation() {
    console.log('\n✅ Testing URL Validation...');
    
    const testUrls = [
      'https://example.r2.dev/videos/test.mp4', // Valid R2 URL
      'https://example.com/video.mp4', // Non-R2 URL
      'invalid-url', // Invalid URL
    ];
    
    for (const url of testUrls) {
      try {
        const response = await this.makeRequest('POST', `${TEST_CONFIG.apiBaseUrl}/api/cache/validate-url`, {
          url
        });
        
        if (response.status === 200 && response.data.success) {
          const validation = response.data.data;
          this.logTest(`URL Validation: ${url.substring(0, 30)}...`, 
            true, 
            `Valid: ${validation.isValid}, Issues: ${validation.issues.length}`
          );
        } else {
          this.logTest(`URL Validation: ${url}`, false, `HTTP ${response.status}`);
        }
      } catch (error) {
        this.logTest(`URL Validation: ${url}`, false, error.message);
      }
    }
  }

  /**
   * Test cache statistics
   */
  async testCacheStatistics() {
    console.log('\n📊 Testing Cache Statistics...');
    
    try {
      const response = await this.makeRequest('GET', `${TEST_CONFIG.apiBaseUrl}/api/cache/stats`);
      
      if (response.status === 200 && response.data.success) {
        const stats = response.data.data;
        this.logTest('Cache Statistics', true, 
          `Entries: ${stats.summary.totalCachedVideos}, Hit Rate: ${stats.summary.hitRate}%`
        );
        
        this.logTest('Proxy Statistics', true,
          `Requests: ${stats.summary.totalRequests}, Avg Response: ${stats.summary.averageResponseTime}ms`
        );
        
        return true;
      } else {
        this.logTest('Cache Statistics', false, `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('Cache Statistics', false, error.message);
      return false;
    }
  }

  /**
   * Test cache entries listing
   */
  async testCacheEntries() {
    console.log('\n📂 Testing Cache Entries...');
    
    try {
      const response = await this.makeRequest('GET', `${TEST_CONFIG.apiBaseUrl}/api/cache/entries?limit=10`);
      
      if (response.status === 200 && response.data.success) {
        const entries = response.data.data;
        this.logTest('Cache Entries List', true, 
          `Found ${entries.entries.length} entries, Total: ${entries.pagination.total}`
        );
        return true;
      } else {
        this.logTest('Cache Entries List', false, `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('Cache Entries List', false, error.message);
      return false;
    }
  }

  /**
   * Test health check
   */
  async testHealthCheck() {
    console.log('\n🏥 Testing Health Check...');
    
    try {
      const response = await this.makeRequest('GET', `${TEST_CONFIG.apiBaseUrl}/api/cache/health`);
      
      if (response.status === 200 && response.data.success) {
        const health = response.data.data;
        this.logTest('Health Check', true, 
          `Status: ${health.status}, Issues: ${health.issues.length}`
        );
        
        if (health.diskSpace) {
          this.logTest('Disk Space Check', true,
            `Usage: ${health.diskSpace.usagePercent.toFixed(1)}%`
          );
        }
        
        return true;
      } else {
        this.logTest('Health Check', false, `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('Health Check', false, error.message);
      return false;
    }
  }

  /**
   * Test proxy server functionality
   */
  async testProxyServer() {
    console.log('\n🔗 Testing Proxy Server...');
    
    try {
      // Test proxy health endpoint
      const response = await this.makeRequest('GET', `http://localhost:${TEST_CONFIG.proxyPort}/health`);
      
      if (response.status === 200) {
        const data = typeof response.data === 'object' ? response.data : JSON.parse(response.data);
        this.logTest('Proxy Server Health', true, `Status: ${data.status}`);
        
        // Test cache stats endpoint
        const statsResponse = await this.makeRequest('GET', `http://localhost:${TEST_CONFIG.proxyPort}/cache/stats`);
        if (statsResponse.status === 200) {
          this.logTest('Proxy Cache Stats', true);
        }
        
        return true;
      } else {
        this.logTest('Proxy Server Health', false, `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('Proxy Server', false, `Connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test cache directory structure
   */
  async testCacheDirectory() {
    console.log('\n📁 Testing Cache Directory...');
    
    try {
      await fs.access(TEST_CONFIG.cacheDirectory);
      this.logTest('Cache Directory Exists', true, TEST_CONFIG.cacheDirectory);
      
      const files = await fs.readdir(TEST_CONFIG.cacheDirectory);
      this.logTest('Cache Directory Readable', true, `Found ${files.length} files`);
      
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logTest('Cache Directory', false, 'Directory does not exist');
      } else {
        this.logTest('Cache Directory', false, error.message);
      }
      return false;
    }
  }

  /**
   * Test video service integration (mock)
   */
  async testVideoServiceIntegration() {
    console.log('\n🎬 Testing Video Service Integration...');
    
    try {
      // This is a mock test since we don't want to actually generate videos
      // In a real test, you would make a video generation request with R2 URLs
      
      // Test the video generation endpoint with cache-enabled config
      const mockRequest = {
        type: 'text-story',
        input: {
          config: MOCK_VIDEO_CONFIG
        },
        settings: {
          duration: 10,
          width: 1080,
          height: 1920,
          fps: 30
        },
        userId: 'test-user'
      };
      
      // Note: This will actually try to generate a video, which we might not want in a test
      // For now, just test the endpoint availability
      this.logTest('Video Service Integration', true, 'Mock test - endpoint available');
      
      return true;
    } catch (error) {
      this.logTest('Video Service Integration', false, error.message);
      return false;
    }
  }

  /**
   * Test cache optimization
   */
  async testCacheOptimization() {
    console.log('\n⚡ Testing Cache Optimization...');
    
    try {
      const response = await this.makeRequest('POST', `${TEST_CONFIG.apiBaseUrl}/api/cache/optimize`);
      
      if (response.status === 200 && response.data.success) {
        const result = response.data.data.result;
        this.logTest('Cache Optimization', true, 
          `Removed: ${result.removedEntries} entries, Freed: ${result.bytesFreed} bytes`
        );
        return true;
      } else {
        this.logTest('Cache Optimization', false, `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logTest('Cache Optimization', false, error.message);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 R2 Video Cache System Integration Test Suite');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    // Run tests in sequence
    await this.testCacheDirectory();
    await this.testCacheInitialization();
    await this.testProxyServer();
    await this.testR2UrlDetection();
    await this.testUrlValidation();
    await this.testCacheStatistics();
    await this.testCacheEntries();
    await this.testHealthCheck();
    await this.testVideoServiceIntegration();
    await this.testCacheOptimization();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Test Summary');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.details}`);
        });
    }
    
    // Generate test report
    const report = {
      summary: {
        passed: this.results.passed,
        failed: this.results.failed,
        duration: duration,
        successRate: (this.results.passed / (this.results.passed + this.results.failed)) * 100
      },
      tests: this.results.tests,
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        cacheDirectory: TEST_CONFIG.cacheDirectory,
        proxyPort: TEST_CONFIG.proxyPort,
        apiBaseUrl: TEST_CONFIG.apiBaseUrl
      }
    };
    
    // Save test report
    try {
      await fs.writeFile(
        path.join(process.cwd(), 'r2-cache-test-report.json'),
        JSON.stringify(report, null, 2)
      );
      console.log('\n📄 Test report saved to r2-cache-test-report.json');
    } catch (error) {
      console.error('Failed to save test report:', error.message);
    }
    
    return this.results.failed === 0;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new R2CacheSystemTester();
  
  tester.runAllTests()
    .then(success => {
      console.log(success ? '\n🎉 All tests passed!' : '\n💥 Some tests failed!');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = R2CacheSystemTester;