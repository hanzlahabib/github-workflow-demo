import { renderMediaOnLambda, getRenderProgress, type AwsRegion } from '@remotion/lambda';

// Import the same interfaces used by the main video service
export interface VideoGenerationRequest {
  type: 'story' | 'reddit' | 'quiz' | 'educational' | 'text-story';
  input: {
    text?: string;
    script?: string;
    title?: string;
    config?: any; // Enhanced frontend config object with all new settings
  };
  settings: {
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    quality?: number;
    outputFormat?: 'mp4' | 'webm';
  };
}

export interface LambdaVideoResult {
  success: boolean;
  videoUrl?: string;
  renderId?: string;
  sizeInBytes?: number;
  durationInSeconds?: number;
  error?: string;
  renderTime?: number;
}

export interface LambdaProgressCallback {
  (progress: {
    phase: 'preparing' | 'rendering' | 'uploading' | 'completed' | 'failed';
    progress: number; // 0-100
    message?: string;
    renderId?: string;
  }): void;
}

class LambdaVideoService {
  private functionName: string;
  private siteUrl: string;
  private region: AwsRegion;
  private readonly POLLING_INTERVAL = 2000; // 2 seconds
  private readonly MAX_WAIT_TIME = 600000; // 10 minutes

  constructor() {
    this.functionName = process.env.LAMBDA_FUNCTION_NAME || '';
    this.siteUrl = process.env.LAMBDA_SITE_URL || '';
    this.region = (process.env.LAMBDA_REGION as AwsRegion) || 'us-east-1';

    if (!this.functionName || !this.siteUrl) {
      console.warn('[LambdaVideoService] Lambda configuration missing. Set LAMBDA_FUNCTION_NAME and LAMBDA_SITE_URL');
    }
  }

  /**
   * Wait for Lambda render to complete by polling getRenderProgress
   * @param renderId The render ID to monitor
   * @param bucketName The S3 bucket name
   * @param onProgress Optional progress callback
   * @returns The final render progress with outputFile URL
   */
  private async waitForRenderCompletion(
    renderId: string,
    bucketName: string,
    onProgress?: LambdaProgressCallback
  ): Promise<any> {
    const startTime = Date.now();
    let lastProgress = 0;
    let stuckCounter = 0;
    let lastProgressValue = -1;
    
    console.log(`[LambdaVideoService] Starting polling for render completion: ${renderId}`);
    
    while (Date.now() - startTime < this.MAX_WAIT_TIME) {
      try {
        const progress = await getRenderProgress({
          renderId,
          bucketName,
          functionName: this.functionName,
          region: this.region
        });

        const currentProgress = Math.round((progress.overallProgress || 0) * 100);
        
        // Update progress if it changed significantly
        if (onProgress && Math.abs(currentProgress - lastProgress) >= 5) {
          onProgress({
            phase: 'rendering',
            progress: currentProgress,
            message: `Lambda render progress: ${currentProgress}%`,
            renderId
          });
          lastProgress = currentProgress;
        }

        // Check if progress is stuck
        if (currentProgress === lastProgressValue) {
          stuckCounter++;
        } else {
          stuckCounter = 0;
          lastProgressValue = currentProgress;
        }

        console.log(`[LambdaVideoService] Render progress: ${currentProgress}% (done: ${progress.done}, errors: ${progress.errors?.length || 0}, stuck: ${stuckCounter})`);
        console.log(`[LambdaVideoService] Progress details: frames rendered: ${progress.framesRendered}, lambdas invoked: ${progress.lambdasInvoked}`);

        // If stuck for too long, log detailed information and consider it an error
        if (stuckCounter > 10) { // 20+ seconds at same progress
          console.error(`[LambdaVideoService] Render appears stuck at ${currentProgress}% for ${stuckCounter * this.POLLING_INTERVAL / 1000} seconds`);
          console.error(`[LambdaVideoService] Detailed progress:`, JSON.stringify(progress, null, 2));
          throw new Error(`Render stuck at ${currentProgress}% - no progress for ${stuckCounter * this.POLLING_INTERVAL / 1000} seconds`);
        }

        // Check if render is complete
        if (progress.done && progress.outputFile) {
          console.log(`[LambdaVideoService] Render completed! Output file: ${progress.outputFile}`);
          return progress;
        }

        // Check for fatal errors
        if (progress.fatalErrorEncountered || progress.errors?.length > 0) {
          console.error('[LambdaVideoService] Render errors detected:', progress.errors);
          console.error('[LambdaVideoService] Full progress object:', JSON.stringify(progress, null, 2));
          const errorDetails = progress.errors?.map(err => 
            typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err)
          ).join(', ') || 'Unknown fatal error';
          throw new Error(`Lambda render failed: ${errorDetails}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));

      } catch (error) {
        console.error(`[LambdaVideoService] Error polling render progress:`, error);
        
        // If it's a progress query error, wait and retry
        if (Date.now() - startTime < this.MAX_WAIT_TIME - 10000) { // Don't retry in last 10 seconds
          await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
          continue;
        } else {
          throw error;
        }
      }
    }

    // Timeout reached
    throw new Error(`Lambda render timeout after ${this.MAX_WAIT_TIME / 1000} seconds. Render ID: ${renderId}`);
  }

  async generateVideo(
    request: VideoGenerationRequest,
    onProgress?: LambdaProgressCallback
  ): Promise<LambdaVideoResult> {
    console.log('[LambdaVideoService] Starting Lambda video generation:', {
      type: request.type,
      functionName: this.functionName,
      siteUrl: this.siteUrl
    });

    if (!this.functionName || !this.siteUrl) {
      return {
        success: false,
        error: 'Lambda configuration missing. Check LAMBDA_FUNCTION_NAME and LAMBDA_SITE_URL environment variables.'
      };
    }

    const startTime = Date.now();
    const compositionId = this.getCompositionId(request.type);
    let progressInterval: NodeJS.Timeout;

    try {
      if (onProgress) {
        onProgress({
          phase: 'preparing',
          progress: 10,
          message: 'Preparing Lambda render...'
        });
      }

      // Simulate progress updates during Lambda processing
      progressInterval = setInterval(() => {
        if (onProgress) {
          const currentProgress = Math.min(90, Math.random() * 20 + 30); // 30-50% range
          onProgress({
            phase: 'rendering',
            progress: currentProgress,
            message: 'Processing video on AWS Lambda...'
          });
        }
      }, 2000); // Update every 2 seconds

      console.log('[LambdaVideoService] Calling renderMediaOnLambda with:', {
        region: this.region,
        functionName: this.functionName,
        serveUrl: this.siteUrl,
        composition: compositionId,
        inputProps: { config: request.input.config }
      });

      const result = await renderMediaOnLambda({
        region: this.region,
        functionName: this.functionName,
        composition: compositionId,
        serveUrl: this.siteUrl,
        inputProps: { config: request.input.config },
        codec: 'h264',
        imageFormat: 'jpeg',
        crf: request.settings?.quality || 23,
        timeoutInMilliseconds: 300000, // 5 minutes
        maxRetries: 3,
        privacy: 'public',
        deleteAfter: '1-day',
        // Optimize for large videos to prevent timeouts
        concurrencyPerLambda: 2, // Match available CPU cores (2)
        framesPerLambda: 50 // Reduce frames per Lambda to prevent timeouts on large videos
      });

      const renderTime = (Date.now() - startTime) / 1000;
      
      // Clear progress interval
      clearInterval(progressInterval);

      if (onProgress) {
        onProgress({
          phase: 'completed',
          progress: 100,
          message: 'Video generated successfully!',
          renderId: result.renderId
        });
      }

      console.log('[LambdaVideoService] Lambda render initiated:', {
        renderId: result.renderId,
        bucketName: (result as any).bucketName,
        renderTime: `${renderTime}s`
      });

      // Extract basic info from initial result
      const bucketName = (result as any).bucketName;
      const renderId = result.renderId;
      
      if (!bucketName || !renderId) {
        throw new Error('Missing bucketName or renderId from Lambda render result');
      }

      // Now wait for the render to actually complete
      console.log('[LambdaVideoService] Waiting for render completion...');
      const finalProgress = await this.waitForRenderCompletion(renderId, bucketName, onProgress);
      
      // Get the final video URL from the completed render
      const videoUrl = finalProgress.outputFile;
      
      if (!videoUrl) {
        throw new Error('No outputFile URL available from completed render');
      }
      
      console.log('[LambdaVideoService] Render completed successfully:', {
        renderId,
        videoUrl,
        sizeInBytes: finalProgress.outputSizeInBytes,
        totalRenderTime: `${(Date.now() - startTime) / 1000}s`
      });
      
      return {
        success: true,
        videoUrl,
        renderId: result.renderId,
        sizeInBytes: finalProgress.outputSizeInBytes || 0,
        renderTime: (Date.now() - startTime) / 1000
      };

    } catch (error) {
      const renderTime = (Date.now() - startTime) / 1000;
      const errorMessage = error instanceof Error ? error.message : 'Unknown Lambda error';
      
      // Clear progress interval on error
      clearInterval(progressInterval);
      
      console.error('[LambdaVideoService] Lambda render failed:', {
        error: errorMessage,
        renderTime: `${renderTime}s`,
        functionName: this.functionName,
        region: this.region
      });

      if (onProgress) {
        onProgress({
          phase: 'failed',
          progress: 0,
          message: `Lambda render failed: ${errorMessage}`
        });
      }

      return {
        success: false,
        error: errorMessage,
        renderTime
      };
    }
  }

  private getCompositionId(type: string): string {
    switch (type) {
      case 'story':
        return 'text-story';
      case 'reddit':
        return 'reddit-video';
      case 'quiz':
        return 'quiz-video';
      case 'educational':
        return 'educational-video';
      default:
        return 'text-story';
    }
  }

  async getStatus(): Promise<{ available: boolean; message: string }> {
    if (!this.functionName || !this.siteUrl) {
      return {
        available: false,
        message: 'Lambda configuration missing'
      };
    }

    try {
      // Simple test - we could add more sophisticated health checks
      return {
        available: true,
        message: `Lambda function ${this.functionName} configured`
      };
    } catch (error) {
      return {
        available: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getFunctionName(): string {
    return this.functionName;
  }

  getSiteUrl(): string {
    return this.siteUrl;
  }

  getRegion(): string {
    return this.region;
  }
}

// Singleton instance
export const lambdaVideoService = new LambdaVideoService();
export default LambdaVideoService;