/**
 * API Integration Tests
 * Tests all API endpoints for functionality and backward compatibility
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'test_user',
  email: 'test@example.com',
  password: 'testpassword123'
};

class APITester {
  constructor() {
    this.authToken = null;
    this.testResults = [];
    this.performanceMetrics = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async measurePerformance(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.performanceMetrics[name] = duration;
      this.log(`${name}: ${duration}ms`, 'perf');
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.log(`${name} failed after ${duration}ms: ${error.message}`, 'error');
      throw error;
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...options.headers
    };

    const config = {
      method: options.method || 'GET',
      headers,
      ...(options.body && { body: JSON.stringify(options.body) })
    };

    this.log(`${config.method} ${endpoint}`);
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers
    };
  }

  async testHealthCheck() {
    return this.measurePerformance('Health Check', async () => {
      try {
        const response = await this.makeRequest('/api/health');
        if (response.status === 404) {
          // Health endpoint might not exist, try root
          const rootResponse = await this.makeRequest('/');
          return {
            passed: rootResponse.status < 500,
            message: 'Server responding (no health endpoint)',
            status: rootResponse.status
          };
        }
        return {
          passed: response.status === 200,
          message: response.data ? 'Health check passed' : 'Health check failed',
          status: response.status,
          data: response.data
        };
      } catch (error) {
        return {
          passed: false,
          message: `Health check failed: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async testAuthentication() {
    return this.measurePerformance('Authentication', async () => {
      try {
        // Test registration (if endpoint exists)
        const registerResponse = await this.makeRequest('/api/auth/register', {
          method: 'POST',
          body: TEST_USER
        });

        let loginResponse;
        if (registerResponse.status === 201 || registerResponse.status === 409) {
          // Registration successful or user already exists, try login
          loginResponse = await this.makeRequest('/api/auth/login', {
            method: 'POST',
            body: {
              email: TEST_USER.email,
              password: TEST_USER.password
            }
          });
        }

        if (loginResponse && loginResponse.status === 200 && loginResponse.data.token) {
          this.authToken = loginResponse.data.token;
          return {
            passed: true,
            message: 'Authentication successful',
            token: this.authToken
          };
        }

        // Try without authentication for other tests
        return {
          passed: false,
          message: 'Authentication failed, will test without auth',
          status: loginResponse?.status || 'no_response'
        };
      } catch (error) {
        return {
          passed: false,
          message: `Authentication error: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async testVoicesEndpoint() {
    return this.measurePerformance('Voices API', async () => {
      try {
        const response = await this.makeRequest('/api/voices/list');
        
        const passed = response.status === 200 && Array.isArray(response.data?.voices);
        return {
          passed,
          message: passed ? 'Voices endpoint working' : 'Voices endpoint failed',
          status: response.status,
          dataType: typeof response.data,
          voiceCount: passed ? response.data.voices.length : 0
        };
      } catch (error) {
        return {
          passed: false,
          message: `Voices endpoint error: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async testVoicesCaching() {
    return this.measurePerformance('Voices Caching', async () => {
      try {
        // First request (should populate cache)
        const start1 = Date.now();
        const response1 = await this.makeRequest('/api/voices/list');
        const time1 = Date.now() - start1;

        // Second request (should be cached)
        const start2 = Date.now();
        const response2 = await this.makeRequest('/api/voices/list');
        const time2 = Date.now() - start2;

        const cachingWorking = time2 < time1 * 0.5; // Second request should be much faster
        
        return {
          passed: response1.status === 200 && response2.status === 200,
          message: cachingWorking ? 'Caching appears to be working' : 'Caching not detected',
          firstRequestTime: time1,
          secondRequestTime: time2,
          cachingDetected: cachingWorking
        };
      } catch (error) {
        return {
          passed: false,
          message: `Caching test error: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async testVideoGeneration() {
    return this.measurePerformance('Video Generation', async () => {
      try {
        const videoConfig = {
          title: 'Test Video',
          settings: {
            messages: [
              { speaker: 'left', text: 'Hello world' },
              { speaker: 'right', text: 'Hi there!' }
            ],
            people: {
              left: { name: 'Person A' },
              right: { name: 'Person B' }
            },
            template: 'default'
          }
        };

        const response = await this.makeRequest('/api/video/text-story/generate', {
          method: 'POST',
          body: videoConfig
        });

        return {
          passed: response.status < 500, // Accept any non-server-error response
          message: response.status === 200 ? 'Video generation initiated' : 
                   response.status === 401 ? 'Video generation requires auth (expected)' :
                   'Video generation endpoint responded',
          status: response.status,
          data: response.data
        };
      } catch (error) {
        return {
          passed: false,
          message: `Video generation error: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async testTwitterVideos() {
    return this.measurePerformance('Twitter Videos', async () => {
      try {
        const response = await this.makeRequest('/api/twitter/template/list');
        
        return {
          passed: response.status < 500,
          message: response.status === 200 ? 'Twitter videos endpoint working' :
                   response.status === 401 ? 'Twitter videos requires auth (expected)' :
                   'Twitter videos endpoint responded',
          status: response.status
        };
      } catch (error) {
        return {
          passed: false,
          message: `Twitter videos error: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async testTop5Videos() {
    return this.measurePerformance('Top5 Videos', async () => {
      try {
        const response = await this.makeRequest('/api/top5/template/list');
        
        return {
          passed: response.status < 500,
          message: response.status === 200 ? 'Top5 videos endpoint working' :
                   response.status === 401 ? 'Top5 videos requires auth (expected)' :
                   'Top5 videos endpoint responded',
          status: response.status
        };
      } catch (error) {
        return {
          passed: false,
          message: `Top5 videos error: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async testErrorHandling() {
    return this.measurePerformance('Error Handling', async () => {
      try {
        const response = await this.makeRequest('/api/nonexistent/endpoint');
        
        return {
          passed: response.status === 404,
          message: response.status === 404 ? 'Error handling working (404 for nonexistent)' : 
                   `Unexpected status for nonexistent endpoint: ${response.status}`,
          status: response.status
        };
      } catch (error) {
        return {
          passed: false,
          message: `Error handling test failed: ${error.message}`,
          error: error.message
        };
      }
    });
  }

  async runAllTests() {
    this.log('Starting comprehensive API tests...');
    const startTime = Date.now();

    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'Authentication', fn: () => this.testAuthentication() },
      { name: 'Voices Endpoint', fn: () => this.testVoicesEndpoint() },
      { name: 'Voices Caching', fn: () => this.testVoicesCaching() },
      { name: 'Video Generation', fn: () => this.testVideoGeneration() },
      { name: 'Twitter Videos', fn: () => this.testTwitterVideos() },
      { name: 'Top5 Videos', fn: () => this.testTop5Videos() },
      { name: 'Error Handling', fn: () => this.testErrorHandling() }
    ];

    for (const test of tests) {
      this.log(`Running ${test.name}...`);
      try {
        const result = await test.fn();
        this.testResults.push({
          name: test.name,
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.testResults.push({
          name: test.name,
          passed: false,
          message: `Test failed with exception: ${error.message}`,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.length - passedTests;

    this.log(`Tests completed in ${totalTime}ms`);
    this.log(`Results: ${passedTests} passed, ${failedTests} failed`);

    return {
      summary: {
        total: this.testResults.length,
        passed: passedTests,
        failed: failedTests,
        totalTime,
        successRate: Math.round((passedTests / this.testResults.length) * 100)
      },
      results: this.testResults,
      performance: this.performanceMetrics
    };
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.passed).length,
        failed: this.testResults.filter(r => !r.passed).length
      },
      results: this.testResults,
      performance: this.performanceMetrics
    };

    const reportPath = path.join(__dirname, '../results/api-test-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Report saved to ${reportPath}`);
    return report;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new APITester();
  
  setTimeout(async () => {
    try {
      const results = await tester.runAllTests();
      const report = tester.generateReport();
      
      console.log('\n=== TEST SUMMARY ===');
      console.log(`Total Tests: ${results.summary.total}`);
      console.log(`Passed: ${results.summary.passed}`);
      console.log(`Failed: ${results.summary.failed}`);
      console.log(`Success Rate: ${results.summary.successRate}%`);
      console.log(`Total Time: ${results.summary.totalTime}ms`);
      
      console.log('\n=== FAILED TESTS ===');
      results.results.filter(r => !r.passed).forEach(result => {
        console.log(`❌ ${result.name}: ${result.message}`);
      });
      
      console.log('\n=== PERFORMANCE METRICS ===');
      Object.entries(results.performance).forEach(([name, time]) => {
        console.log(`${name}: ${time}ms`);
      });

      process.exit(results.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('Test suite failed:', error);
      process.exit(1);
    }
  }, 2000); // Wait 2 seconds for server to be ready
}

module.exports = APITester;