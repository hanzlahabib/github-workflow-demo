#!/usr/bin/env npx ts-node

/**
 * Production Lambda Deployment Script for ReelSpeed
 * 
 * This script automates the complete deployment of Remotion Lambda infrastructure:
 * - Cleans up existing broken deployments
 * - Creates optimized Lambda function with proper settings
 * - Deploys video service site with latest configurations
 * - Validates deployment and tests functionality
 * - Updates environment configuration
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
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DeploymentConfig {
  region: 'us-east-1' | 'us-west-2' | 'eu-west-1';
  functionName: string;
  siteName: string;
  bucketName: string;
  memory: 512 | 1024 | 2048 | 3008;
  timeout: number;
  diskSizeInMb: 2048 | 4096 | 8192;
}

class LambdaDeploymentManager {
  private config: DeploymentConfig;
  private videoServicePath: string;

  constructor() {
    const region = 'us-east-1';
    this.config = {
      region,
      functionName: `reelspeed-render-${Date.now()}`,
      siteName: `reelspeed-site-${Date.now()}`,
      bucketName: process.env.LAMBDA_BUCKET_NAME || `remotionlambda-${region}-${Math.random().toString(36).substring(7)}`,
      memory: 2048, // Optimal for video rendering
      timeout: 120, // 2 minutes
      diskSizeInMb: 4096 // 4GB disk space
    };

    this.videoServicePath = path.resolve(__dirname, '../reelspeed-video-service');
    
    console.log('🚀 ReelSpeed Lambda Deployment Manager');
    console.log('Configuration:', this.config);
  }

  /**
   * Complete deployment workflow
   */
  async deployComplete(): Promise<void> {
    try {
      console.log('\n🧹 Step 1: Cleaning up existing deployments...');
      await this.cleanupExistingDeployments();
      
      console.log('\n📦 Step 2: Deploying Lambda function...');
      const functionInfo = await this.deployFunction();
      
      console.log('\n🌐 Step 3: Deploying video service site...');
      const siteInfo = await this.deploySite();
      
      console.log('\n✅ Step 4: Validating deployment...');
      await this.validateDeployment();
      
      console.log('\n⚙️  Step 5: Updating environment configuration...');
      await this.updateEnvironmentConfig(functionInfo, siteInfo);
      
      console.log('\n🎉 Deployment completed successfully!');
      console.log('\n📋 Deployment Summary:');
      console.log(`   Lambda Function: ${functionInfo.functionName}`);
      console.log(`   Site URL: ${siteInfo.serveUrl}`);
      console.log(`   Region: ${this.config.region}`);
      console.log(`   Memory: ${this.config.memory}MB`);
      console.log(`   Timeout: ${this.config.timeout}s`);
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Clean up existing broken deployments
   */
  private async cleanupExistingDeployments(): Promise<void> {
    try {
      // Get existing functions and sites
      const functions = await getFunctions({
        region: this.config.region,
        compatibleOnly: false
      });

      const sites = await getSites({
        region: this.config.region
      });

      console.log(`Found ${functions.length} existing functions and ${sites.length} existing sites`);

      // Delete old functions (keep only the most recent 2)
      const oldFunctions = functions
        .sort((a, b) => new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime())
        .slice(2); // Keep 2 most recent

      for (const func of oldFunctions) {
        if (func.FunctionName) {
          console.log(`🗑️  Deleting old function: ${func.FunctionName}`);
          try {
            await deleteFunction({
              region: this.config.region,
              functionName: func.FunctionName
            });
          } catch (error) {
            console.warn(`Warning: Could not delete function ${func.FunctionName}:`, error);
          }
        }
      }

      // Delete old sites (keep only the most recent 2)
      const oldSites = sites
        .sort((a, b) => new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime())
        .slice(2); // Keep 2 most recent

      for (const site of oldSites) {
        console.log(`🗑️  Deleting old site: ${site.id}`);
        try {
          await deleteSite({
            region: this.config.region,
            siteName: site.id,
            bucketName: this.config.bucketName
          });
        } catch (error) {
          console.warn(`Warning: Could not delete site ${site.id}:`, error);
        }
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.warn('Warning: Cleanup encountered issues:', error);
      // Continue with deployment even if cleanup fails
    }
  }

  /**
   * Deploy optimized Lambda function
   */
  private async deployFunction(): Promise<any> {
    console.log('📦 Deploying Lambda function with optimized settings...');

    try {
      const result = await deployFunction({
        region: this.config.region,
        functionName: this.config.functionName,
        memorySizeInMb: this.config.memory,
        timeoutInSeconds: this.config.timeout,
        createCloudWatchLogGroup: true,
        diskSizeInMb: this.config.diskSizeInMb,
        // Architecture optimization
        architecture: 'x86_64', // Better compatibility
        // Environment variables for the Lambda function
        customRoleArn: undefined, // Use default IAM role
        enableLambdaInsights: false // Disable to reduce costs
      });

      console.log('✅ Lambda function deployed successfully');
      console.log(`   Function Name: ${result.functionName}`);
      console.log(`   Memory: ${this.config.memory}MB`);
      console.log(`   Timeout: ${this.config.timeout}s`);

      return result;

    } catch (error) {
      console.error('❌ Failed to deploy Lambda function:', error);
      throw error;
    }
  }

  /**
   * Deploy video service site
   */
  private async deploySite(): Promise<any> {
    console.log('🌐 Deploying video service site...');

    try {
      const result = await deploySite({
        region: this.config.region,
        bucketName: this.config.bucketName,
        siteName: this.config.siteName,
        entryPoint: path.join(this.videoServicePath, 'src/index.ts'),
        options: {
          enableCaching: true,
          publicDir: path.join(this.videoServicePath, 'public'),
          rootDir: this.videoServicePath,
          onBundleProgress: (progress: number) => {
            if (progress % 20 === 0) { // Log every 20%
              console.log(`   Bundling progress: ${Math.round(progress)}%`);
            }
          },
          onUploadProgress: (progress: any) => {
            if (progress.totalSize && progress.uploadedSize % 1000000 < 100000) { // Log every ~1MB
              const percent = Math.round((progress.uploadedSize / progress.totalSize) * 100);
              console.log(`   Upload progress: ${percent}% (${Math.round(progress.uploadedSize / 1024 / 1024)}MB)`);
            }
          }
        },
        privacy: 'public'
      });

      console.log('✅ Site deployed successfully');
      console.log(`   Site Name: ${result.siteName}`);
      console.log(`   Serve URL: ${result.serveUrl}`);
      console.log(`   Files uploaded: ${result.stats.uploadedFiles}`);

      return result;

    } catch (error) {
      console.error('❌ Failed to deploy site:', error);
      throw error;
    }
  }

  /**
   * Validate deployment
   */
  private async validateDeployment(): Promise<void> {
    console.log('✅ Validating deployment...');

    try {
      // Validate function
      const functionInfo = await getFunctionInfo({
        region: this.config.region,
        functionName: this.config.functionName
      });

      console.log(`   ✅ Function validation passed: ${functionInfo.functionName}`);
      console.log(`      Memory: ${functionInfo.memorySizeInMb}MB`);
      console.log(`      Timeout: ${functionInfo.timeoutInSeconds}s`);

      // Validate site
      const sites = await getSites({
        region: this.config.region,
        bucketName: this.config.bucketName
      });
      const siteInfo = sites.find(site => site.id === this.config.siteName);

      console.log(`   ✅ Site validation passed: ${siteInfo.siteName}`);
      console.log(`      Serve URL: ${siteInfo.serveUrl}`);

      // Test HTTP access to site
      const response = await fetch(siteInfo.serveUrl);
      if (response.ok) {
        console.log(`   ✅ Site HTTP access test passed (${response.status})`);
      } else {
        throw new Error(`Site HTTP access failed: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Update environment configuration
   */
  private async updateEnvironmentConfig(functionInfo: any, siteInfo: any): Promise<void> {
    console.log('⚙️  Updating environment configuration...');

    const envConfig = {
      LAMBDA_FUNCTION_NAME: functionInfo.functionName,
      LAMBDA_SITE_URL: siteInfo.serveUrl,
      LAMBDA_BUCKET_NAME: this.config.bucketName,
      LAMBDA_REGION: this.config.region,
      LAMBDA_TIMEOUT: (this.config.timeout * 1000).toString(), // Convert to milliseconds
      LAMBDA_MEMORY: this.config.memory.toString(),
      LAMBDA_MAX_CONCURRENCY: '10',
      LAMBDA_MAX_RETRIES: '3'
    };

    // Write to .env file
    const envPath = path.resolve(__dirname, '../services/reelspeed-backend/.env.lambda');
    const envContent = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    await fs.promises.writeFile(envPath, envContent);
    console.log(`   ✅ Environment configuration written to: ${envPath}`);

    // Also write to a JSON file for easy consumption
    const jsonPath = path.resolve(__dirname, '../services/reelspeed-backend/lambda-config.json');
    await fs.promises.writeFile(jsonPath, JSON.stringify(envConfig, null, 2));
    console.log(`   ✅ JSON configuration written to: ${jsonPath}`);

    console.log('\n📋 Environment Variables to Set:');
    Object.entries(envConfig).forEach(([key, value]) => {
      console.log(`   export ${key}="${value}"`);
    });
  }

  /**
   * Quick deployment for development
   */
  async deployQuick(): Promise<void> {
    console.log('⚡ Quick deployment (no cleanup)...');
    
    try {
      const functionInfo = await this.deployFunction();
      const siteInfo = await this.deploySite();
      await this.updateEnvironmentConfig(functionInfo, siteInfo);
      
      console.log('⚡ Quick deployment completed!');
    } catch (error) {
      console.error('❌ Quick deployment failed:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const manager = new LambdaDeploymentManager();

  try {
    switch (command) {
      case 'deploy-clean':
        await manager.deployComplete();
        break;
      case 'deploy-quick':
        await manager.deployQuick();
        break;
      case 'help':
      default:
        console.log(`
🚀 ReelSpeed Lambda Deployment Manager

Usage:
  npm run deploy-lambda deploy-clean    # Full deployment with cleanup
  npm run deploy-lambda deploy-quick    # Quick deployment (no cleanup)
  npm run deploy-lambda help           # Show this help

Commands:
  deploy-clean  - Complete deployment with cleanup of old resources
  deploy-quick  - Quick deployment without cleanup (for development)
  help         - Show this help message

Environment Variables (optional):
  LAMBDA_BUCKET_NAME    - S3 bucket name for Lambda resources
  AWS_REGION           - AWS region (default: us-east-1)
  
Make sure your AWS credentials are configured before running.
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Deployment error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { LambdaDeploymentManager };