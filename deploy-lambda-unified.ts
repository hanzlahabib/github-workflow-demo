#!/usr/bin/env npx ts-node

/**
 * Unified Lambda Deployment Script for ReelSpeed
 * 
 * Single, clean deployment matching Clippie's approach:
 * - Deploy Lambda function with optimal settings
 * - Deploy video service site
 * - Update configuration automatically
 * - Simple, reliable process
 */

import { 
  deployFunction,
  deploySite,
  getFunctions,
  getSites,
  deleteFunction,
  deleteSite,
  getFunctionInfo
} from '@remotion/lambda';
import * as fs from 'fs/promises';
import * as path from 'path';
import { lambdaConfig, generateEnvVars } from './src/config/lambda.config';

interface DeploymentResult {
  functionName: string;
  siteName: string;
  siteUrl: string;
  bucketName: string;
}

/**
 * Unified Lambda Deployment Manager
 * Clean, simple approach matching Clippie
 */
class UnifiedLambdaDeployment {
  private videoServicePath: string;

  constructor() {
    this.videoServicePath = path.resolve(__dirname, '../reelspeed-video-service');
    console.log('🚀 ReelSpeed Unified Lambda Deployment');
    console.log(`Configuration: ${lambdaConfig.functionName} in ${lambdaConfig.region}`);
  }

  /**
   * Complete deployment workflow
   */
  async deploy(): Promise<DeploymentResult> {
    try {
      console.log('\n🧹 Step 1: Cleaning up old deployments...');
      await this.cleanupOldDeployments();
      
      console.log('\n📦 Step 2: Deploying Lambda function...');
      const functionInfo = await this.deployFunction();
      
      console.log('\n🌐 Step 3: Deploying video service site...');
      const siteInfo = await this.deploySite();
      
      console.log('\n⚙️  Step 4: Updating configuration...');
      await this.updateConfiguration(functionInfo, siteInfo);
      
      console.log('\n✅ Step 5: Validating deployment...');
      await this.validateDeployment();
      
      const result: DeploymentResult = {
        functionName: functionInfo.functionName,
        siteName: siteInfo.siteName,
        siteUrl: siteInfo.serveUrl,
        bucketName: lambdaConfig.bucketName
      };
      
      this.displaySuccess(result);
      return result;
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Deploy Lambda function with MAXIMUM PERFORMANCE settings
   */
  private async deployFunction(): Promise<any> {
    console.log(`📦 Deploying HIGH-PERFORMANCE function: ${lambdaConfig.functionName}`);
    console.log(`🚀 MAXIMUM SPECS: ${lambdaConfig.memory}MB RAM, ${lambdaConfig.timeout}s timeout, ${lambdaConfig.diskSize}MB disk`);

    try {
      const result = await deployFunction({
        region: lambdaConfig.region,
        functionName: lambdaConfig.functionName,
        memorySizeInMb: lambdaConfig.memory, // 3008MB (maximum)
        timeoutInSeconds: lambdaConfig.timeout, // 900s (15 minutes maximum)
        diskSizeInMb: lambdaConfig.diskSize, // 10GB (maximum)
        createCloudWatchLogGroup: true,
        architecture: 'x86_64', // Better compatibility for video processing
        enableLambdaInsights: lambdaConfig.enableInsights,
        // Additional performance optimizations
        runtime: 'nodejs20.x', // Latest Node.js for best performance
        environment: {
          // Optimize Node.js for video processing
          NODE_ENV: 'production',
          NODE_OPTIONS: '--max-old-space-size=2900', // Use most of the 3008MB memory
          // Remotion-specific optimizations
          REMOTION_CONCURRENCY_PER_LAMBDA: lambdaConfig.concurrencyPerLambda.toString(),
          REMOTION_FRAMES_PER_LAMBDA: lambdaConfig.framesPerLambda.toString()
        }
      });

      console.log(`✅ Function deployed: ${result.functionName}`);
      console.log(`   Memory: ${lambdaConfig.memory}MB`);
      console.log(`   Timeout: ${lambdaConfig.timeout}s`);
      console.log(`   Disk: ${lambdaConfig.diskSize}MB`);

      return result;

    } catch (error) {
      console.error('❌ Function deployment failed:', error);
      throw error;
    }
  }

  /**
   * Deploy video service site
   */
  private async deploySite(): Promise<any> {
    console.log(`🌐 Deploying site to bucket: ${lambdaConfig.bucketName}`);

    try {
      const siteName = `${lambdaConfig.functionName}-site-${Date.now()}`;
      
      const result = await deploySite({
        region: lambdaConfig.region,
        bucketName: lambdaConfig.bucketName,
        siteName,
        entryPoint: path.join(this.videoServicePath, 'src/index.ts'),
        options: {
          enableCaching: true,
          publicDir: path.join(this.videoServicePath, 'public'),
          rootDir: this.videoServicePath,
          onBundleProgress: (progress: number) => {
            if (progress % 25 === 0) {
              console.log(`   Bundling: ${Math.round(progress)}%`);
            }
          },
          onUploadProgress: (progress: any) => {
            if (progress.totalSize && progress.uploadedSize % 500000 < 100000) {
              const percent = Math.round((progress.uploadedSize / progress.totalSize) * 100);
              console.log(`   Uploading: ${percent}%`);
            }
          }
        },
        privacy: 'public'
      });

      console.log(`✅ Site deployed: ${result.siteName}`);
      console.log(`   URL: ${result.serveUrl}`);

      return result;

    } catch (error) {
      console.error('❌ Site deployment failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old deployments (keep 2 most recent)
   */
  private async cleanupOldDeployments(): Promise<void> {
    try {
      // Clean up old functions
      const functions = await getFunctions({
        region: lambdaConfig.region,
        compatibleOnly: false
      });

      const oldFunctions = functions
        .filter(f => f.FunctionName?.startsWith('reelspeed-lambda-renderer'))
        .sort((a, b) => new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime())
        .slice(2); // Keep 2 most recent

      for (const func of oldFunctions) {
        if (func.FunctionName) {
          console.log(`🗑️  Deleting old function: ${func.FunctionName}`);
          try {
            await deleteFunction({
              region: lambdaConfig.region,
              functionName: func.FunctionName
            });
          } catch (error) {
            console.warn(`Warning: Could not delete function ${func.FunctionName}`);
          }
        }
      }

      // Clean up old sites
      const sites = await getSites({
        region: lambdaConfig.region,
        bucketName: lambdaConfig.bucketName
      });

      const oldSites = sites
        .filter(s => s.id.includes('reelspeed-lambda-renderer'))
        .sort((a, b) => new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime())
        .slice(2); // Keep 2 most recent

      for (const site of oldSites) {
        console.log(`🗑️  Deleting old site: ${site.id}`);
        try {
          await deleteSite({
            region: lambdaConfig.region,
            siteName: site.id,
            bucketName: lambdaConfig.bucketName
          });
        } catch (error) {
          console.warn(`Warning: Could not delete site ${site.id}`);
        }
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.warn('Warning: Cleanup encountered issues, continuing...');
    }
  }

  /**
   * Update configuration files
   */
  private async updateConfiguration(functionInfo: any, siteInfo: any): Promise<void> {
    console.log('⚙️  Updating configuration files...');

    // Update lambda configuration
    const configData = {
      LAMBDA_FUNCTION_NAME: functionInfo.functionName,
      LAMBDA_SITE_URL: siteInfo.serveUrl,
      LAMBDA_BUCKET_NAME: lambdaConfig.bucketName,
      LAMBDA_REGION: lambdaConfig.region,
      LAMBDA_MEMORY: lambdaConfig.memory.toString(),
      LAMBDA_TIMEOUT: lambdaConfig.timeout.toString(),
      LAMBDA_MAX_RETRIES: lambdaConfig.maxRetries.toString(),
      LAMBDA_MAX_CONCURRENCY: lambdaConfig.maxConcurrency.toString()
    };

    // Write to JSON config file
    const configPath = path.resolve(__dirname, 'lambda-config.json');
    await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
    console.log(`   ✅ Configuration written to: ${configPath}`);

    // Update .env.lambda file
    const envPath = path.resolve(__dirname, '.env.lambda.new');
    const envContent = Object.entries(configData)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    await fs.writeFile(envPath, envContent);
    console.log(`   ✅ Environment file written to: ${envPath}`);
    console.log('   📝 Run: mv .env.lambda.new .env.lambda to activate');
  }

  /**
   * Validate deployment
   */
  private async validateDeployment(): Promise<void> {
    console.log('✅ Validating deployment...');

    try {
      // Check function exists
      const functionInfo = await getFunctionInfo({
        region: lambdaConfig.region,
        functionName: lambdaConfig.functionName
      });
      console.log(`   ✅ Function validated: ${functionInfo.functionName}`);

      // Check site accessibility
      const sites = await getSites({
        region: lambdaConfig.region,
        bucketName: lambdaConfig.bucketName
      });
      
      const latestSite = sites
        .filter(s => s.id.includes(lambdaConfig.functionName))
        .sort((a, b) => new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime())[0];

      if (latestSite) {
        console.log(`   ✅ Site validated: ${latestSite.serveUrl}`);
        
        // Test HTTP access
        const response = await fetch(latestSite.serveUrl);
        if (response.ok) {
          console.log(`   ✅ Site accessible (${response.status})`);
        } else {
          console.warn(`   ⚠️  Site returned ${response.status}`);
        }
      }

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Display deployment success information
   */
  private displaySuccess(result: DeploymentResult): void {
    console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
    console.log(''.padEnd(50, '='));
    console.log(`Function: ${result.functionName}`);
    console.log(`Site: ${result.siteName}`);
    console.log(`URL: ${result.siteUrl}`);
    console.log(`Bucket: ${result.bucketName}`);
    console.log(`Region: ${lambdaConfig.region}`);
    console.log(`Memory: ${lambdaConfig.memory}MB`);
    console.log(`Timeout: ${lambdaConfig.timeout}s`);
    
    console.log('\n💰 ESTIMATED COSTS (per video):');
    console.log('- Short (30s): ~$0.02-$0.05');
    console.log('- Medium (60s): ~$0.05-$0.10');
    console.log('- Long (120s): ~$0.10-$0.20');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. mv .env.lambda.new .env.lambda');
    console.log('2. Restart backend service');
    console.log('3. Test video generation');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'deploy';

  const deployment = new UnifiedLambdaDeployment();

  try {
    switch (command) {
      case 'deploy':
        await deployment.deploy();
        break;
      case 'help':
      default:
        console.log(`
🚀 ReelSpeed Unified Lambda Deployment

Usage:
  npm run deploy-lambda        # Deploy everything
  npm run deploy-lambda help   # Show this help

Features:
- Single deployment script
- Automatic cleanup
- Configuration updates
- Validation checks
- Clippie-style simplicity

Environment Variables (optional):
  NODE_ENV                 # development|production|test
  LAMBDA_FUNCTION_NAME     # Override function name
  LAMBDA_BUCKET_NAME       # Override bucket name
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Deployment error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { UnifiedLambdaDeployment };