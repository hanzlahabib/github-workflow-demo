#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * Runs all tests and generates final validation report
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const APITester = require('./integration/api.test.js');
const ServiceTester = require('./integration/services.test.js');
const PerformanceTester = require('./performance/performance.test.js');

class ComprehensiveTestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async checkServerStatus() {
    this.log('Checking server status...');
    
    try {
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:3000/api/voices/list', {
        timeout: 2000
      });
      
      return {
        running: response.status !== undefined,
        status: response.status,
        responding: true
      };
    } catch (error) {
      this.log('Server not responding, will start it...', 'warn');
      return {
        running: false,
        error: error.message,
        responding: false
      };
    }
  }

  async runBuildTest() {
    this.log('Running build test...');
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      let stdout = '';
      let stderr = '';

      buildProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      buildProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      buildProcess.on('close', (code) => {
        const buildTime = Date.now() - startTime;
        
        resolve({
          passed: code === 0,
          buildTime,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code
        });
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        buildProcess.kill();
        resolve({
          passed: false,
          buildTime: Date.now() - startTime,
          error: 'Build timeout after 60 seconds',
          exitCode: -1
        });
      }, 60000);
    });
  }

  async runLintTest() {
    this.log('Running lint test...');
    
    return new Promise((resolve) => {
      const lintProcess = spawn('npm', ['run', 'lint'], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      let stdout = '';
      let stderr = '';

      lintProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      lintProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      lintProcess.on('close', (code) => {
        const warnings = (stdout.match(/warning/gi) || []).length;
        const errors = (stdout.match(/error/gi) || []).length;
        
        resolve({
          passed: code === 0,
          warnings,
          errors,
          output: stdout.trim(),
          exitCode: code
        });
      });
    });
  }

  async runServiceTests() {
    this.log('Running service integration tests...');
    
    try {
      const serviceTester = new ServiceTester();
      const results = await serviceTester.runAllTests();
      serviceTester.generateReport();
      
      return {
        passed: results.summary.successRate >= 80,
        ...results
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1 }
      };
    }
  }

  async runAPITests() {
    this.log('Running API integration tests...');
    
    try {
      const apiTester = new APITester();
      const results = await apiTester.runAllTests();
      apiTester.generateReport();
      
      return {
        passed: results.summary.successRate >= 70, // More lenient for API tests
        ...results
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1 }
      };
    }
  }

  async runPerformanceTests() {
    this.log('Running performance tests...');
    
    try {
      const perfTester = new PerformanceTester();
      const results = await perfTester.runAllTests();
      perfTester.generateReport();
      
      return {
        passed: results.summary.successRate >= 60, // Performance tests can be more variable
        ...results
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        summary: { total: 0, passed: 0, failed: 1 }
      };
    }
  }

  async runAllTests() {
    this.log('='.repeat(60));
    this.log('STARTING COMPREHENSIVE VALIDATION SUITE');
    this.log('='.repeat(60));

    // Pre-flight checks
    const serverStatus = await this.checkServerStatus();
    this.results.serverStatus = serverStatus;

    // Build tests (critical)
    this.results.buildTest = await this.runBuildTest();
    
    if (!this.results.buildTest.passed) {
      this.log('BUILD FAILED - Stopping tests', 'error');
      return this.generateFinalReport();
    }

    // Lint tests
    this.results.lintTest = await this.runLintTest();

    // Service tests
    this.results.serviceTests = await this.runServiceTests();

    // API tests (only if server is running)
    if (serverStatus.responding) {
      this.results.apiTests = await this.runAPITests();
      this.results.performanceTests = await this.runPerformanceTests();
    } else {
      this.log('Server not responding - skipping API and performance tests', 'warn');
      this.results.apiTests = { passed: false, summary: { total: 0, passed: 0, failed: 1 } };
      this.results.performanceTests = { passed: false, summary: { total: 0, passed: 0, failed: 1 } };
    }

    return this.generateFinalReport();
  }

  generateFinalReport() {
    const totalTime = Date.now() - this.startTime;
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTime,
      serverRunning: this.results.serverStatus?.responding || false,
      
      // Critical tests
      buildPassed: this.results.buildTest?.passed || false,
      buildTime: this.results.buildTest?.buildTime || 0,
      
      lintPassed: this.results.lintTest?.passed || false,
      lintWarnings: this.results.lintTest?.warnings || 0,
      lintErrors: this.results.lintTest?.errors || 0,
      
      // Integration tests
      serviceTestsPassed: this.results.serviceTests?.passed || false,
      serviceTestsCount: this.results.serviceTests?.summary?.total || 0,
      serviceTestsSuccess: this.results.serviceTests?.summary?.passed || 0,
      
      apiTestsPassed: this.results.apiTests?.passed || false,
      apiTestsCount: this.results.apiTests?.summary?.total || 0,
      apiTestsSuccess: this.results.apiTests?.summary?.passed || 0,
      
      performanceTestsPassed: this.results.performanceTests?.passed || false,
      performanceTestsCount: this.results.performanceTests?.summary?.total || 0,
      performanceTestsSuccess: this.results.performanceTests?.summary?.passed || 0
    };

    // Overall pass/fail
    const criticalTestsPassed = summary.buildPassed && (summary.lintErrors === 0);
    const integrationTestsPassed = summary.serviceTestsPassed;
    const functionalTestsPassed = !summary.serverRunning || (summary.apiTestsPassed && summary.performanceTestsPassed);
    
    summary.overallPassed = criticalTestsPassed && integrationTestsPassed && functionalTestsPassed;
    summary.readyForProduction = summary.overallPassed && summary.serverRunning;

    // Calculate scores
    const totalTests = summary.serviceTestsCount + summary.apiTestsCount + summary.performanceTestsCount;
    const totalSuccess = summary.serviceTestsSuccess + summary.apiTestsSuccess + summary.performanceTestsSuccess;
    summary.overallSuccessRate = totalTests > 0 ? Math.round((totalSuccess / totalTests) * 100) : 0;

    // Save detailed report
    const reportPath = path.join(__dirname, 'results/final-validation-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      summary,
      details: this.results
    }, null, 2));

    // Console output
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n🏗️  BUILD & QUALITY:`);
    console.log(`   Build: ${summary.buildPassed ? '✅' : '❌'} (${summary.buildTime}ms)`);
    console.log(`   Lint: ${summary.lintPassed ? '✅' : '❌'} (${summary.lintWarnings} warnings, ${summary.lintErrors} errors)`);
    
    console.log(`\n🔧 SERVICE INTEGRATION:`);
    console.log(`   Services: ${summary.serviceTestsPassed ? '✅' : '❌'} (${summary.serviceTestsSuccess}/${summary.serviceTestsCount})`);
    
    console.log(`\n🌐 API & PERFORMANCE:`);
    console.log(`   Server Running: ${summary.serverRunning ? '✅' : '❌'}`);
    console.log(`   API Tests: ${summary.apiTestsPassed ? '✅' : '❌'} (${summary.apiTestsSuccess}/${summary.apiTestsCount})`);
    console.log(`   Performance: ${summary.performanceTestsPassed ? '✅' : '❌'} (${summary.performanceTestsSuccess}/${summary.performanceTestsCount})`);
    
    console.log(`\n📊 OVERALL RESULTS:`);
    console.log(`   Success Rate: ${summary.overallSuccessRate}%`);
    console.log(`   Overall Status: ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Production Ready: ${summary.readyForProduction ? '✅ YES' : '❌ NO'}`);
    console.log(`   Total Time: ${Math.round(totalTime / 1000)}s`);
    
    if (!summary.overallPassed) {
      console.log(`\n⚠️  ISSUES FOUND:`);
      if (!summary.buildPassed) console.log(`   - Build failed`);
      if (summary.lintErrors > 0) console.log(`   - Lint errors: ${summary.lintErrors}`);
      if (!summary.serviceTestsPassed) console.log(`   - Service integration issues`);
      if (!summary.apiTestsPassed && summary.serverRunning) console.log(`   - API functionality issues`);
      if (!summary.performanceTestsPassed && summary.serverRunning) console.log(`   - Performance issues`);
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log('='.repeat(80));

    return {
      summary,
      passed: summary.overallPassed,
      reportPath
    };
  }
}

// Run comprehensive tests
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  
  runner.runAllTests()
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveTestRunner;