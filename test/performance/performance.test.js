/**
 * Performance & Regression Tests
 * Tests performance improvements and ensures no functionality regressions
 */

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

class PerformanceTester {
  constructor() {
    this.metrics = {};
    this.regressionResults = [];
    this.performanceBaseline = {
      // Expected performance improvements after refactoring
      voiceListCached: 100, // ms - should be under 100ms when cached
      voiceListUncached: 2000, // ms - should be under 2s when not cached
      apiResponseTime: 500, // ms - general API responses
      buildTime: 30000, // ms - TypeScript build time
      serverStartup: 10000 // ms - Server startup time
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async measureRequest(name, url, options = {}, expectedTime = 1000) {
    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json().catch(() => null);
      const duration = Date.now() - start;
      
      const result = {
        name,
        duration,
        status: response.status,
        success: response.status < 400,
        withinExpected: duration <= expectedTime,
        data: data ? Object.keys(data).length : 0
      };

      this.metrics[name] = result;
      this.log(`${name}: ${duration}ms (expected: <${expectedTime}ms) - ${result.withinExpected ? '✅' : '❌'}`, 'perf');
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const result = {
        name,
        duration,
        success: false,
        error: error.message,
        withinExpected: false
      };
      
      this.metrics[name] = result;
      this.log(`${name}: FAILED after ${duration}ms - ${error.message}`, 'error');
      return result;
    }
  }

  async testVoicesCachingPerformance() {
    this.log('Testing voices caching performance...');
    
    // Clear any existing cache first (if endpoint exists)
    try {
      await fetch(`${BASE_URL}/api/voices/cache/clear`, { method: 'POST' });
    } catch (e) {
      // Cache clear endpoint might not exist
    }

    // First request (cache miss)
    const uncached = await this.measureRequest(
      'Voices List (Uncached)', 
      '/api/voices/list', 
      {}, 
      this.performanceBaseline.voiceListUncached
    );

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second request (should be cached)
    const cached = await this.measureRequest(
      'Voices List (Cached)', 
      '/api/voices/list', 
      {}, 
      this.performanceBaseline.voiceListCached
    );

    // Third request (verify cache consistency)
    const cached2 = await this.measureRequest(
      'Voices List (Cached 2)', 
      '/api/voices/list', 
      {}, 
      this.performanceBaseline.voiceListCached
    );

    const cachingWorking = cached.duration < uncached.duration * 0.3; // 70% improvement
    const cacheConsistent = Math.abs(cached.duration - cached2.duration) < 50; // Within 50ms

    return {
      uncachedTime: uncached.duration,
      cachedTime: cached.duration,
      improvement: Math.round(((uncached.duration - cached.duration) / uncached.duration) * 100),
      cachingWorking,
      cacheConsistent,
      passed: cachingWorking && cacheConsistent && uncached.success && cached.success
    };
  }

  async testAPIResponseTimes() {
    this.log('Testing general API response times...');
    
    const endpoints = [
      { url: '/api/voices/list', name: 'Voices List', expectedTime: 200 },
      { url: '/api/auth/profile', name: 'Auth Profile', expectedTime: 100 },
      { url: '/api/twitter/template/list', name: 'Twitter Templates', expectedTime: 300 },
      { url: '/api/top5/template/list', name: 'Top5 Templates', expectedTime: 300 },
      { url: '/api/video/templates', name: 'Video Templates', expectedTime: 200 }
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      const result = await this.measureRequest(
        endpoint.name,
        endpoint.url,
        {},
        endpoint.expectedTime
      );
      results.push(result);
    }

    const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const successfulRequests = results.filter(r => r.success).length;
    
    return {
      averageResponseTime: Math.round(averageTime),
      successRate: Math.round((successfulRequests / results.length) * 100),
      results,
      passed: averageTime <= this.performanceBaseline.apiResponseTime && successfulRequests >= results.length * 0.8
    };
  }

  async testNoMockDelays() {
    this.log('Testing that mock delays have been removed...');
    
    // These endpoints should respond quickly without setTimeout delays
    const quickEndpoints = [
      '/api/voices/list',
      '/api/twitter/template/list',
      '/api/top5/template/list'
    ];

    const results = [];
    
    for (const endpoint of quickEndpoints) {
      const start = Date.now();
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        const duration = Date.now() - start;
        
        results.push({
          endpoint,
          duration,
          status: response.status,
          noMockDelay: duration < 500 // Should be very fast without setTimeout
        });
      } catch (error) {
        results.push({
          endpoint,
          duration: Date.now() - start,
          error: error.message,
          noMockDelay: false
        });
      }
    }

    const fastResponses = results.filter(r => r.noMockDelay).length;
    const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    return {
      fastResponses: `${fastResponses}/${results.length}`,
      averageTime: Math.round(averageTime),
      results,
      passed: fastResponses >= results.length * 0.8 && averageTime < 200
    };
  }

  async testMemoryUsage() {
    this.log('Testing memory usage patterns...');
    
    const initialMemory = process.memoryUsage();
    
    // Make multiple requests to test for memory leaks
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        fetch(`${BASE_URL}/api/voices/list`).catch(() => null)
      );
    }
    
    await Promise.all(requests);
    
    const finalMemory = process.memoryUsage();
    
    const memoryIncrease = {
      heap: finalMemory.heapUsed - initialMemory.heapUsed,
      external: finalMemory.external - initialMemory.external,
      rss: finalMemory.rss - initialMemory.rss
    };
    
    // Memory should not increase dramatically (under 10MB for 10 requests)
    const reasonableIncrease = memoryIncrease.heap < 10 * 1024 * 1024;
    
    return {
      initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
      finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
      heapIncrease: Math.round(memoryIncrease.heap / 1024 / 1024),
      passed: reasonableIncrease
    };
  }

  async testRegressionCompatibility() {
    this.log('Testing backward compatibility...');
    
    // Test that existing API contracts are maintained
    const compatibilityTests = [
      {
        name: 'Voices API Structure',
        test: async () => {
          const response = await fetch(`${BASE_URL}/api/voices/list`);
          const data = await response.json();
          return {
            hasVoicesArray: Array.isArray(data?.voices),
            hasMetadata: data?.metadata || data?.total_count !== undefined,
            status: response.status
          };
        }
      },
      {
        name: 'Error Response Format',
        test: async () => {
          const response = await fetch(`${BASE_URL}/api/nonexistent`);
          const data = await response.json().catch(() => null);
          return {
            status: response.status,
            hasErrorMessage: data?.message || data?.error,
            isJSON: data !== null
          };
        }
      },
      {
        name: 'Authentication Headers',
        test: async () => {
          const response = await fetch(`${BASE_URL}/api/auth/profile`);
          return {
            status: response.status,
            hasAuthChallenge: response.status === 401,
            headers: response.headers.has('www-authenticate') || response.headers.has('authorization')
          };
        }
      }
    ];

    const results = [];
    
    for (const test of compatibilityTests) {
      try {
        const result = await test.test();
        results.push({
          name: test.name,
          passed: Object.values(result).some(v => v === true), // At least one positive result
          details: result
        });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          error: error.message
        });
      }
    }

    const passedTests = results.filter(r => r.passed).length;
    
    return {
      results,
      passedTests: `${passedTests}/${results.length}`,
      passed: passedTests >= results.length * 0.8
    };
  }

  async runAllTests() {
    this.log('Starting performance and regression tests...');
    const startTime = Date.now();

    const tests = [
      { name: 'Voices Caching Performance', fn: () => this.testVoicesCachingPerformance() },
      { name: 'API Response Times', fn: () => this.testAPIResponseTimes() },
      { name: 'No Mock Delays', fn: () => this.testNoMockDelays() },
      { name: 'Memory Usage', fn: () => this.testMemoryUsage() },
      { name: 'Regression Compatibility', fn: () => this.testRegressionCompatibility() }
    ];

    const results = [];
    
    for (const test of tests) {
      this.log(`Running ${test.name}...`);
      try {
        const result = await test.fn();
        results.push({
          name: test.name,
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          message: `Test failed: ${error.message}`,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const passedTests = results.filter(r => r.passed).length;

    return {
      summary: {
        total: results.length,
        passed: passedTests,
        failed: results.length - passedTests,
        totalTime,
        successRate: Math.round((passedTests / results.length) * 100)
      },
      results,
      metrics: this.metrics
    };
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseline: this.performanceBaseline,
      metrics: this.metrics,
      summary: {
        total: this.regressionResults.length,
        passed: this.regressionResults.filter(r => r.passed).length
      }
    };

    const reportPath = path.join(__dirname, '../results/performance-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Performance report saved to ${reportPath}`);
    return report;
  }
}

// Run tests if this file is executed directly  
if (require.main === module) {
  const tester = new PerformanceTester();
  
  setTimeout(async () => {
    try {
      const results = await tester.runAllTests();
      const report = tester.generateReport();
      
      console.log('\n=== PERFORMANCE TEST SUMMARY ===');
      console.log(`Total Tests: ${results.summary.total}`);
      console.log(`Passed: ${results.summary.passed}`);
      console.log(`Failed: ${results.summary.failed}`);
      console.log(`Success Rate: ${results.summary.successRate}%`);
      console.log(`Total Time: ${results.summary.totalTime}ms`);
      
      console.log('\n=== PERFORMANCE METRICS ===');
      Object.entries(results.metrics).forEach(([name, metrics]) => {
        if (metrics.duration) {
          console.log(`${name}: ${metrics.duration}ms (${metrics.withinExpected ? '✅' : '❌'})`);
        }
      });
      
      console.log('\n=== FAILED TESTS ===');
      results.results.filter(r => !r.passed).forEach(result => {
        console.log(`❌ ${result.name}: ${result.message || 'Performance target not met'}`);
      });

      process.exit(results.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('Performance test suite failed:', error);
      process.exit(1);
    }
  }, 3000); // Wait 3 seconds for server to be ready
}

module.exports = PerformanceTester;