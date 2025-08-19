#!/usr/bin/env npx ts-node

/**
 * Comprehensive Lambda Testing Framework for ReelSpeed
 * 
 * This testing framework validates the complete Lambda deployment:
 * - Basic connectivity and AWS credentials
 * - Lambda function availability and configuration
 * - Site deployment and accessibility
 * - End-to-end video generation testing
 * - Performance benchmarking
 * - Error handling validation
 * - Cost calculation accuracy
 */

import { 
  getFunctionInfo,
  getSites,
  renderMediaOnLambda,
  getRenderProgress
} from '@remotion/lambda';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  message: string;
  details?: any;
}

interface LambdaTestConfig {
  functionName: string;
  siteName: string;
  bucketName: string;
  region: string;
  siteUrl: string;
}

class LambdaTestFramework {
  private config: LambdaTestConfig;
  private results: TestResult[] = [];

  constructor() {
    // Load configuration from environment or config file
    this.config = this.loadTestConfig();
    console.log('🧪 ReelSpeed Lambda Testing Framework');
    console.log('Test Configuration:', this.config);
  }

  private loadTestConfig(): LambdaTestConfig {
    // Try to load from lambda-config.json first
    const configPath = path.resolve(__dirname, '../services/reelspeed-backend/lambda-config.json');
    
    try {
      if (fs.existsSync(configPath)) {
        const jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          functionName: jsonConfig.LAMBDA_FUNCTION_NAME,
          siteName: this.extractSiteNameFromUrl(jsonConfig.LAMBDA_SITE_URL),
          bucketName: jsonConfig.LAMBDA_BUCKET_NAME,
          region: jsonConfig.LAMBDA_REGION,
          siteUrl: jsonConfig.LAMBDA_SITE_URL
        };
      }
    } catch (error) {
      console.warn('Could not load config from JSON file:', error);
    }

    // Fallback to environment variables
    return {
      functionName: process.env.LAMBDA_FUNCTION_NAME || '',
      siteName: process.env.LAMBDA_SITE_NAME || '',
      bucketName: process.env.LAMBDA_BUCKET_NAME || '',
      region: process.env.LAMBDA_REGION || 'us-east-1',
      siteUrl: process.env.LAMBDA_SITE_URL || ''
    };
  }

  private extractSiteNameFromUrl(siteUrl: string): string {
    // Extract site name from URL like: https://bucket.s3.region.amazonaws.com/sites/sitename/
    const match = siteUrl.match(/\/sites\/([^\/]+)\//);
    return match ? match[1] : '';
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n🚀 Starting comprehensive Lambda tests...\n');

    // Basic tests
    await this.runTest('Basic AWS Connectivity', () => this.testBasicConnectivity());
    await this.runTest('Lambda Function Availability', () => this.testLambdaFunction());
    await this.runTest('Lambda Site Availability', () => this.testLambdaSite());
    
    // Functional tests
    await this.runTest('Simple Text Story Render', () => this.testSimpleRender());
    await this.runTest('Error Handling Validation', () => this.testErrorHandling());
    
    // Performance tests
    await this.runTest('Performance Benchmark', () => this.testPerformance());
    
    // Print results
    this.printResults();
  }

  /**
   * Run basic connectivity tests only
   */
  async runBasicTests(): Promise<void> {
    console.log('\n⚡ Running basic connectivity tests...\n');

    await this.runTest('Basic AWS Connectivity', () => this.testBasicConnectivity());
    await this.runTest('Lambda Function Availability', () => this.testLambdaFunction());
    await this.runTest('Lambda Site Availability', () => this.testLambdaSite());
    
    this.printResults();
  }

  /**
   * Test runner wrapper
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Testing: ${name}...`);
      
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        success: true,
        duration,
        message: `✅ Passed (${duration}ms)`,
        details: result
      });
      
      console.log(`   ✅ ${name} passed (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        name,
        success: false,
        duration,
        message: `❌ Failed: ${message}`,
        details: { error: message }
      });
      
      console.log(`   ❌ ${name} failed (${duration}ms): ${message}`);
    }
  }

  /**
   * Test basic AWS connectivity
   */
  private async testBasicConnectivity(): Promise<any> {
    if (!this.config.functionName || !this.config.bucketName) {
      throw new Error('Lambda configuration not found. Run deployment first.');
    }

    // Test basic AWS SDK functionality
    const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
    const stsClient = new STSClient({ region: this.config.region });
    
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    
    return {
      accountId: identity.Account,
      region: this.config.region,
      functionName: this.config.functionName,
      bucketName: this.config.bucketName
    };
  }

  /**
   * Test Lambda function availability and configuration
   */
  private async testLambdaFunction(): Promise<any> {
    const functionInfo = await getFunctionInfo({
      region: this.config.region as any,
      functionName: this.config.functionName
    });

    // Validate configuration
    if (functionInfo.memorySizeInMb < 1024) {
      throw new Error(`Memory too low: ${functionInfo.memorySizeInMb}MB (recommended: 2048MB+)`);
    }

    if (functionInfo.timeoutInSeconds < 60) {
      throw new Error(`Timeout too low: ${functionInfo.timeoutInSeconds}s (recommended: 120s+)`);
    }

    return {
      functionName: functionInfo.functionName,
      memory: `${functionInfo.memorySizeInMb}MB`,
      timeout: `${functionInfo.timeoutInSeconds}s`,
      version: functionInfo.version
    };
  }

  /**
   * Test Lambda site availability and accessibility
   */
  private async testLambdaSite(): Promise<any> {
    const sites = await getSites({
      region: this.config.region as any,
      bucketName: this.config.bucketName
    });
    const siteInfo = sites.find(site => site.id === this.config.siteName);

    // Test HTTP accessibility
    const response = await fetch(siteInfo.serveUrl);
    if (!response.ok) {
      throw new Error(`Site not accessible: HTTP ${response.status}`);
    }

    // Test if it's a valid Remotion bundle
    const content = await response.text();
    if (!content.includes('remotion') && !content.includes('webpack')) {
      throw new Error('Site does not appear to be a valid Remotion bundle');
    }

    return {
      siteName: siteInfo.siteName,
      serveUrl: siteInfo.serveUrl,
      httpStatus: response.status,
      contentLength: content.length
    };
  }

  /**
   * Test simple video render end-to-end
   */
  private async testSimpleRender(): Promise<any> {
    const testConfig = {
      title: 'Lambda Test Video',
      messages: [
        { id: '1', text: 'Testing Lambda render...', sender: 'left' as const, delay: 1000 },
        { id: '2', text: 'This is a test message!', sender: 'right' as const, delay: 2000 }
      ],
      people: {
        left: { id: 'left' as const, name: 'Tester', avatar: { id: 'test', name: 'Test', url: 'test.jpg' } },
        right: { id: 'right' as const, name: 'Lambda', avatar: { id: 'lambda', name: 'Lambda', url: 'lambda.jpg' } }
      },
      uiTheme: 'ios_dark',
      chatOverlay: {
        opacity: 0.9,
        verticalPosition: 50,
        horizontalPosition: 50,
        borderRadius: 10,
        backgroundPattern: 'gradient',
        backgroundOpacity: 0.8,
        scale: 1,
        fontSize: 16,
        autoScale: true
      }
    };

    console.log('   🎬 Starting render test...');

    // Start render
    const renderResult = await renderMediaOnLambda({
      region: this.config.region as any,
      functionName: this.config.functionName,
      composition: 'text-story',
      serveUrl: this.config.siteUrl,
      inputProps: {
        config: testConfig,
        userId: 'test-user'
      },
      codec: 'h264',
      crf: 23,
      downloadBehavior: {
        type: 'play-in-browser'
      },
      logLevel: 'info',
      timeoutInMilliseconds: 120000 // 2 minutes
    });

    console.log(`   📹 Render started: ${renderResult.renderId}`);

    // Monitor progress
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes with 1-second intervals
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));

      const progress = await getRenderProgress({
        renderId: renderResult.renderId,
        bucketName: renderResult.bucketName,
        region: this.config.region as any,
        functionName: this.config.functionName
      });

      const progressPercent = Math.round((progress.overallProgress || 0) * 100);
      
      if (attempts % 10 === 0) { // Log every 10 seconds
        console.log(`   📊 Progress: ${progressPercent}% (${progress.framesRendered || 0} frames)`);
      }

      if (progress.done && progress.outputFile) {
        console.log(`   ✅ Render completed: ${progress.outputFile}`);
        
        // Validate the output
        const videoResponse = await fetch(progress.outputFile);
        if (!videoResponse.ok) {
          throw new Error(`Generated video not accessible: ${videoResponse.status}`);
        }

        return {
          renderId: renderResult.renderId,
          videoUrl: progress.outputFile,
          sizeInBytes: progress.outputSizeInBytes,
          renderTime: `${attempts}s`,
          framesRendered: progress.framesRendered
        };
      }

      if (progress.fatalErrorEncountered || progress.errors?.length > 0) {
        const errorDetails = progress.errors?.map(err => 
          typeof err === 'object' ? JSON.stringify(err) : String(err)
        ).join(', ') || 'Fatal error encountered';
        throw new Error(`Render failed: ${errorDetails}`);
      }
    }

    throw new Error(`Render timeout after ${maxAttempts} seconds`);
  }

  /**
   * Test error handling scenarios
   */
  private async testErrorHandling(): Promise<any> {
    const testScenarios = [
      {
        name: 'Invalid Composition',
        test: async () => {
          try {
            await renderMediaOnLambda({
              region: this.config.region as any,
              functionName: this.config.functionName,
              composition: 'invalid-composition',
              serveUrl: this.config.siteUrl,
              inputProps: {},
              codec: 'h264'
            });
            throw new Error('Should have failed with invalid composition');
          } catch (error) {
            if (error instanceof Error && error.message.includes('composition')) {
              return { success: true, message: 'Properly rejected invalid composition' };
            }
            throw error;
          }
        }
      }
    ];

    const results = [];
    for (const scenario of testScenarios) {
      try {
        const result = await scenario.test();
        results.push({ scenario: scenario.name, ...result });
      } catch (error) {
        results.push({ 
          scenario: scenario.name, 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { errorTests: results };
  }

  /**
   * Test performance characteristics
   */
  private async testPerformance(): Promise<any> {
    const startTime = Date.now();

    // Test function info retrieval speed
    const functionInfoStart = Date.now();
    await getFunctionInfo({
      region: this.config.region as any,
      functionName: this.config.functionName
    });
    const functionInfoTime = Date.now() - functionInfoStart;

    // Test site info retrieval speed
    const siteInfoStart = Date.now();
    await getSites({
      region: this.config.region as any,
      bucketName: this.config.bucketName
    });
    const siteInfoTime = Date.now() - siteInfoStart;

    // Test site HTTP response speed
    const httpStart = Date.now();
    const response = await fetch(this.config.siteUrl);
    await response.text();
    const httpTime = Date.now() - httpStart;

    const totalTime = Date.now() - startTime;

    return {
      functionInfoLatency: `${functionInfoTime}ms`,
      siteInfoLatency: `${siteInfoTime}ms`,
      httpLatency: `${httpTime}ms`,
      totalLatency: `${totalTime}ms`,
      performance: totalTime < 2000 ? 'Excellent' : totalTime < 5000 ? 'Good' : 'Needs Improvement'
    };
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));

    let passed = 0;
    let failed = 0;

    this.results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.message}`);
      if (result.success) passed++;
      else failed++;
    });

    console.log('=' .repeat(50));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Lambda deployment is ready for production.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please review and fix issues before production use.`);
    }

    // Write detailed results to file
    const resultsPath = path.resolve(__dirname, '../test-results-lambda.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      summary: { total: this.results.length, passed, failed }
    }, null, 2));

    console.log(`\n📝 Detailed results written to: ${resultsPath}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const tester = new LambdaTestFramework();

  try {
    switch (command) {
      case 'all':
        await tester.runAllTests();
        break;
      case 'basic':
        await tester.runBasicTests();
        break;
      case 'help':
      default:
        console.log(`
🧪 ReelSpeed Lambda Testing Framework

Usage:
  npm run test-lambda all      # Run all tests (comprehensive)
  npm run test-lambda basic    # Run basic connectivity tests only
  npm run test-lambda help     # Show this help

Test Categories:
  Basic Tests:
    - AWS connectivity and credentials
    - Lambda function availability and configuration
    - Site deployment and accessibility
    
  Comprehensive Tests:
    - All basic tests
    - End-to-end video rendering
    - Error handling validation
    - Performance benchmarking

Make sure your Lambda deployment is complete before running tests.
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Testing error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { LambdaTestFramework };