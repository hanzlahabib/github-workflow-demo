/**
 * Service Integration Tests
 * Tests service initialization, configuration, and integration
 */

const path = require('path');
const fs = require('fs');

class ServiceTester {
  constructor() {
    this.testResults = [];
    this.srcPath = path.join(__dirname, '../../src');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async testServiceFileStructure() {
    try {
      const servicesDir = path.join(this.srcPath, 'services');
      const configDir = path.join(this.srcPath, 'config');
      
      const requiredServices = [
        'cache.ts',
        'elevenlabs.ts',
        'openai.ts',
        'remotion.ts',
        'videoService.ts',
        'index.ts'
      ];

      const requiredConfigs = [
        'centralized.ts',
        'services.ts'
      ];

      const serviceResults = requiredServices.map(service => {
        const servicePath = path.join(servicesDir, service);
        const exists = fs.existsSync(servicePath);
        return { service, exists, path: servicePath };
      });

      const configResults = requiredConfigs.map(config => {
        const configPath = path.join(configDir, config);
        const exists = fs.existsSync(configPath);
        return { config, exists, path: configPath };
      });

      const allServicesExist = serviceResults.every(r => r.exists);
      const allConfigsExist = configResults.every(r => r.exists);

      return {
        passed: allServicesExist && allConfigsExist,
        message: `Services: ${serviceResults.filter(r => r.exists).length}/${requiredServices.length}, Configs: ${configResults.filter(r => r.exists).length}/${requiredConfigs.length}`,
        services: serviceResults,
        configs: configResults
      };
    } catch (error) {
      return {
        passed: false,
        message: `File structure test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async testServiceImports() {
    try {
      const testImports = [];
      
      // Test centralized config import
      try {
        const configPath = path.join(this.srcPath, 'config/centralized.ts');
        const configContent = fs.readFileSync(configPath, 'utf8');
        testImports.push({
          file: 'config/centralized.ts',
          exists: true,
          hasExports: configContent.includes('export'),
          hasConfig: configContent.includes('centralizedConfig') || configContent.includes('config')
        });
      } catch (error) {
        testImports.push({
          file: 'config/centralized.ts',
          exists: false,
          error: error.message
        });
      }

      // Test cache service import
      try {
        const cachePath = path.join(this.srcPath, 'services/cache.ts');
        const cacheContent = fs.readFileSync(cachePath, 'utf8');
        testImports.push({
          file: 'services/cache.ts',
          exists: true,
          hasExports: cacheContent.includes('export'),
          hasClass: cacheContent.includes('class') || cacheContent.includes('CacheService')
        });
      } catch (error) {
        testImports.push({
          file: 'services/cache.ts',
          exists: false,
          error: error.message
        });
      }

      // Test service index
      try {
        const indexPath = path.join(this.srcPath, 'services/index.ts');
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        testImports.push({
          file: 'services/index.ts',
          exists: true,
          hasExports: indexContent.includes('export'),
          hasImports: indexContent.includes('import')
        });
      } catch (error) {
        testImports.push({
          file: 'services/index.ts',
          exists: false,
          error: error.message
        });
      }

      const passedImports = testImports.filter(t => t.exists && t.hasExports).length;
      
      return {
        passed: passedImports >= testImports.length * 0.8, // 80% success rate
        message: `${passedImports}/${testImports.length} service imports working`,
        imports: testImports
      };
    } catch (error) {
      return {
        passed: false,
        message: `Import test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async testConfigurationSystem() {
    try {
      const configResults = [];

      // Test centralized config
      const centralizedPath = path.join(this.srcPath, 'config/centralized.ts');
      if (fs.existsSync(centralizedPath)) {
        const content = fs.readFileSync(centralizedPath, 'utf8');
        configResults.push({
          file: 'centralized.ts',
          exists: true,
          hasEnvironmentVars: content.includes('process.env'),
          hasDefaults: content.includes('default') || content.includes('fallback'),
          hasValidation: content.includes('validate') || content.includes('required')
        });
      }

      // Test services config
      const servicesPath = path.join(this.srcPath, 'config/services.ts');
      if (fs.existsSync(servicesPath)) {
        const content = fs.readFileSync(servicesPath, 'utf8');
        configResults.push({
          file: 'services.ts',
          exists: true,
          hasServiceConfigs: content.includes('Service') || content.includes('Config'),
          hasExports: content.includes('export')
        });
      }

      const workingConfigs = configResults.filter(c => c.exists).length;
      
      return {
        passed: workingConfigs > 0,
        message: `${workingConfigs} configuration files working`,
        configs: configResults
      };
    } catch (error) {
      return {
        passed: false,
        message: `Configuration test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async testCacheImplementation() {
    try {
      const cachePath = path.join(this.srcPath, 'services/cache.ts');
      
      if (!fs.existsSync(cachePath)) {
        return {
          passed: false,
          message: 'Cache service file not found'
        };
      }

      const content = fs.readFileSync(cachePath, 'utf8');
      
      const features = {
        hasClass: content.includes('class') && content.includes('Cache'),
        hasGet: content.includes('get(') || content.includes('get '),
        hasSet: content.includes('set(') || content.includes('set '),
        hasDelete: content.includes('delete') || content.includes('remove'),
        hasExpiration: content.includes('ttl') || content.includes('expire') || content.includes('timeout'),
        hasMemoryCache: content.includes('Map') || content.includes('cache'),
        hasRedisSupport: content.includes('redis') || content.includes('Redis')
      };

      const implementedFeatures = Object.values(features).filter(Boolean).length;
      const totalFeatures = Object.keys(features).length;

      return {
        passed: implementedFeatures >= totalFeatures * 0.6, // 60% of features
        message: `Cache implementation: ${implementedFeatures}/${totalFeatures} features`,
        features
      };
    } catch (error) {
      return {
        passed: false,
        message: `Cache test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async testAuthMiddleware() {
    try {
      const authPath = path.join(this.srcPath, 'middleware/auth.ts');
      
      if (!fs.existsSync(authPath)) {
        return {
          passed: false,
          message: 'Auth middleware file not found'
        };
      }

      const content = fs.readFileSync(authPath, 'utf8');
      
      const features = {
        hasJWTVerification: content.includes('jwt') || content.includes('JWT'),
        hasAuthMiddleware: content.includes('middleware') || content.includes('auth'),
        hasErrorHandling: content.includes('try') && content.includes('catch'),
        hasUserExtraction: content.includes('user') || content.includes('User'),
        hasTokenValidation: content.includes('token') && content.includes('valid'),
        hasUnauthorizedResponse: content.includes('401') || content.includes('unauthorized')
      };

      const implementedFeatures = Object.values(features).filter(Boolean).length;
      const totalFeatures = Object.keys(features).length;

      return {
        passed: implementedFeatures >= totalFeatures * 0.7, // 70% of features
        message: `Auth middleware: ${implementedFeatures}/${totalFeatures} features`,
        features
      };
    } catch (error) {
      return {
        passed: false,
        message: `Auth middleware test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async testCodeQuality() {
    try {
      const results = {
        duplicateCode: 0,
        longFunctions: 0,
        complexityIssues: 0,
        missingErrorHandling: 0
      };

      // Check major service files
      const filesToCheck = [
        'services/elevenlabs.ts',
        'services/openai.ts',
        'services/cache.ts',
        'routes/voices.ts',
        'routes/textVideo.ts'
      ];

      for (const file of filesToCheck) {
        const filePath = path.join(this.srcPath, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for setTimeout (should be removed by Agent 1)
          const setTimeouts = (content.match(/setTimeout/g) || []).length;
          if (setTimeouts > 0) results.duplicateCode += setTimeouts;
          
          // Check for try-catch blocks (error handling)
          const tryCatches = (content.match(/try\s*{/g) || []).length;
          const functions = (content.match(/function|=>/g) || []).length;
          if (functions > tryCatches) results.missingErrorHandling++;
          
          // Check line count (functions shouldn't be too long)
          const lines = content.split('\n');
          if (lines.length > 500) results.longFunctions++;
        }
      }

      const issues = Object.values(results).reduce((sum, count) => sum + count, 0);
      
      return {
        passed: issues < 10, // Fewer than 10 total issues
        message: `Code quality: ${issues} issues found`,
        details: results
      };
    } catch (error) {
      return {
        passed: false,
        message: `Code quality test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async testBuildCompatibility() {
    try {
      // Check TypeScript config
      const tsconfigPath = path.join(this.srcPath, '../tsconfig.json');
      const packagePath = path.join(this.srcPath, '../package.json');
      
      const tsconfigExists = fs.existsSync(tsconfigPath);
      const packageExists = fs.existsSync(packagePath);
      
      let scripts = {};
      if (packageExists) {
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        scripts = packageContent.scripts || {};
      }

      const requiredScripts = ['build', 'dev', 'start'];
      const hasRequiredScripts = requiredScripts.every(script => scripts[script]);

      return {
        passed: tsconfigExists && packageExists && hasRequiredScripts,
        message: `Build compatibility: tsconfig(${tsconfigExists}), package.json(${packageExists}), scripts(${hasRequiredScripts})`,
        scripts
      };
    } catch (error) {
      return {
        passed: false,
        message: `Build compatibility test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async runAllTests() {
    this.log('Starting service integration tests...');
    const startTime = Date.now();

    const tests = [
      { name: 'Service File Structure', fn: () => this.testServiceFileStructure() },
      { name: 'Service Imports', fn: () => this.testServiceImports() },
      { name: 'Configuration System', fn: () => this.testConfigurationSystem() },
      { name: 'Cache Implementation', fn: () => this.testCacheImplementation() },
      { name: 'Auth Middleware', fn: () => this.testAuthMiddleware() },
      { name: 'Code Quality', fn: () => this.testCodeQuality() },
      { name: 'Build Compatibility', fn: () => this.testBuildCompatibility() }
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

    this.log(`Service tests completed in ${totalTime}ms`);
    this.log(`Results: ${passedTests} passed, ${failedTests} failed`);

    return {
      summary: {
        total: this.testResults.length,
        passed: passedTests,
        failed: failedTests,
        totalTime,
        successRate: Math.round((passedTests / this.testResults.length) * 100)
      },
      results: this.testResults
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
      results: this.testResults
    };

    const reportPath = path.join(__dirname, '../results/service-test-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Report saved to ${reportPath}`);
    return report;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ServiceTester();
  
  (async () => {
    try {
      const results = await tester.runAllTests();
      const report = tester.generateReport();
      
      console.log('\n=== SERVICE TEST SUMMARY ===');
      console.log(`Total Tests: ${results.summary.total}`);
      console.log(`Passed: ${results.summary.passed}`);
      console.log(`Failed: ${results.summary.failed}`);
      console.log(`Success Rate: ${results.summary.successRate}%`);
      console.log(`Total Time: ${results.summary.totalTime}ms`);
      
      console.log('\n=== FAILED TESTS ===');
      results.results.filter(r => !r.passed).forEach(result => {
        console.log(`❌ ${result.name}: ${result.message}`);
      });
      
      console.log('\n=== PASSED TESTS ===');
      results.results.filter(r => r.passed).forEach(result => {
        console.log(`✅ ${result.name}: ${result.message}`);
      });

      process.exit(results.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('Service test suite failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = ServiceTester;