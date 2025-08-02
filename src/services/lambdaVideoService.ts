import { 
  renderMediaOnLambda, 
  getRenderProgress, 
  deleteRender,
  type AwsRegion 
} from '@remotion/lambda';

// Production-ready interfaces
export interface VideoGenerationRequest {
  type: 'story' | 'reddit' | 'quiz' | 'educational' | 'text-story';
  input: {
    text?: string;
    script?: string;
    title?: string;
    config?: any;
  };
  settings: {
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    quality?: number;
    outputFormat?: 'mp4' | 'webm';
  };
  userId: string;
}

export interface LambdaVideoResult {
  success: boolean;
  videoUrl?: string;
  renderId?: string;
  sizeInBytes?: number;
  durationInSeconds?: number;
  error?: string;
  renderTime?: number;
  cost?: number;
}

export interface LambdaProgressCallback {
  (progress: {
    phase: 'preparing' | 'rendering' | 'uploading' | 'completed' | 'failed';
    progress: number; // 0-100
    message?: string;
    renderId?: string;
    estimatedTimeRemaining?: number;
    cost?: number;
  }): void;
}

export interface LambdaConfig {
  functionName: string;
  region: AwsRegion;
  bucketName: string;
  timeout: number;
  memory: number;
  maxConcurrency: number;
  maxRetries: number;
}

class ProductionLambdaVideoService {
  private config: LambdaConfig;
  private activeRenders: Map<string, {
    renderId: string;
    bucketName: string;
    startTime: number;
    cancelled: boolean;
  }> = new Map();

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): LambdaConfig {
    return {
      functionName: process.env.LAMBDA_FUNCTION_NAME || '',
      region: (process.env.LAMBDA_REGION as AwsRegion) || 'us-east-1',
      bucketName: process.env.LAMBDA_BUCKET_NAME || '',
      timeout: parseInt(process.env.LAMBDA_TIMEOUT || '120000'),
      memory: parseInt(process.env.LAMBDA_MEMORY || '2048'),
      maxConcurrency: parseInt(process.env.LAMBDA_MAX_CONCURRENCY || '10'),
      maxRetries: parseInt(process.env.LAMBDA_MAX_RETRIES || '3')
    };
  }

  private validateConfiguration(): void {
    const issues: string[] = [];
    
    if (!this.config.functionName) issues.push('LAMBDA_FUNCTION_NAME not set');
    if (!this.config.bucketName) issues.push('LAMBDA_BUCKET_NAME not set');
    
    if (issues.length > 0) {
      throw new Error(`Lambda configuration invalid: ${issues.join(', ')}`);
    }
  }

  /**
   * Generate video using production-ready Lambda implementation
   */
  async generateVideo(
    request: VideoGenerationRequest,
    videoId: string,
    onProgress?: LambdaProgressCallback
  ): Promise<LambdaVideoResult> {
    const startTime = Date.now();
    let totalCost = 0;

    console.log(`[Lambda] Starting production video generation for ${videoId}`);

    try {
      // Step 1: Validate and prepare
      onProgress?.({
        phase: 'preparing',
        progress: 5,
        message: 'Validating request and preparing Lambda environment...',
        cost: 0
      });

      const compositionId = this.getCompositionId(request.type);
      const serveUrl = await this.getServeUrl();

      // Step 2: Start Lambda render with optimal settings
      onProgress?.({
        phase: 'preparing',
        progress: 15,
        message: 'Starting Lambda render with optimized settings...',
        cost: 0
      });

      const renderResult = await this.renderWithRetry(
        compositionId,
        serveUrl,
        request,
        this.config.maxRetries
      );

      console.log(`[Lambda] Render started: ${renderResult.renderId}`);

      // Track the render
      this.activeRenders.set(videoId, {
        renderId: renderResult.renderId,
        bucketName: renderResult.bucketName,
        startTime,
        cancelled: false
      });

      // Step 3: Monitor progress with intelligent polling
      const result = await this.monitorRenderProgress(
        renderResult.renderId,
        renderResult.bucketName,
        videoId,
        onProgress
      );

      // Step 4: Calculate costs and finalize
      const renderTime = (Date.now() - startTime) / 1000;
      totalCost = this.calculateCost(renderTime, this.config.memory);

      onProgress?.({
        phase: 'completed',
        progress: 100,
        message: '🎉 Video generated successfully on Lambda!',
        renderId: renderResult.renderId,
        cost: totalCost
      });

      console.log(`[Lambda] Video generation completed:`, {
        videoId,
        renderId: renderResult.renderId,
        renderTime: `${renderTime}s`,
        cost: `$${totalCost.toFixed(4)}`
      });

      // Clean up tracking
      this.activeRenders.delete(videoId);

      return {
        success: true,
        videoUrl: result.outputFile,
        renderId: renderResult.renderId,
        sizeInBytes: result.outputSizeInBytes || 0,
        renderTime,
        cost: totalCost
      };

    } catch (error) {
      const renderTime = (Date.now() - startTime) / 1000;
      totalCost = this.calculateCost(renderTime, this.config.memory);
      
      console.error(`[Lambda] Video generation failed for ${videoId}:`, error);

      // Clean up on error
      this.activeRenders.delete(videoId);

      onProgress?.({
        phase: 'failed',
        progress: 0,
        message: `Lambda render failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cost: totalCost
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Lambda error',
        renderTime,
        cost: totalCost
      };
    }
  }

  /**
   * Render with automatic retry logic
   */
  private async renderWithRetry(
    compositionId: string,
    serveUrl: string,
    request: VideoGenerationRequest,
    maxRetries: number
  ): Promise<{ renderId: string; bucketName: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Lambda] Render attempt ${attempt}/${maxRetries}`);

        const result = await renderMediaOnLambda({
          region: this.config.region,
          functionName: this.config.functionName,
          composition: compositionId,
          serveUrl,
          inputProps: {
            config: request.input.config || {},
            userId: request.userId
          },
          codec: 'h264',
          crf: request.settings?.quality || 18, // High quality
          downloadBehavior: {
            type: 'play-in-browser'
          },
          maxRetries: 1, // Let our wrapper handle retries
          timeoutInMilliseconds: this.config.timeout,
          logLevel: 'info',
          // Optimized for performance and cost
          concurrencyPerLambda: 2, // Match Lambda CPU cores
          framesPerLambda: 50 // Balanced for progress updates
        });

        return {
          renderId: result.renderId,
          bucketName: result.bucketName
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown render error');
        
        if (attempt < maxRetries) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.warn(`[Lambda] Render attempt ${attempt} failed, retrying in ${backoffTime}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }

    throw lastError || new Error('All render attempts failed');
  }

  /**
   * Intelligent progress monitoring with adaptive polling
   */
  private async monitorRenderProgress(
    renderId: string,
    bucketName: string,
    videoId: string,
    onProgress?: LambdaProgressCallback
  ): Promise<any> {
    let pollInterval = 2000; // Start with 2 seconds
    let consecutiveNoProgress = 0;
    let lastProgress = 0;
    const maxWaitTime = this.config.timeout + 30000; // Add buffer
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Check for cancellation
      const renderInfo = this.activeRenders.get(videoId);
      if (renderInfo?.cancelled) {
        throw new Error('Render cancelled by user');
      }

      try {
        const progress = await getRenderProgress({
          renderId,
          bucketName,
          region: this.config.region,
          functionName: this.config.functionName
        });

        const currentProgress = Math.round((progress.overallProgress || 0) * 100);
        const renderTime = (Date.now() - startTime) / 1000;
        const estimatedCost = this.calculateCost(renderTime, this.config.memory);

        // Adaptive progress reporting
        if (currentProgress > lastProgress) {
          onProgress?.({
            phase: 'rendering',
            progress: Math.min(currentProgress, 95), // Cap at 95% until complete
            message: `Rendering video on Lambda... ${progress.framesRendered || 0} frames processed`,
            renderId,
            estimatedTimeRemaining: this.estimateTimeRemaining(currentProgress, renderTime),
            cost: estimatedCost
          });
          
          lastProgress = currentProgress;
          consecutiveNoProgress = 0;
          pollInterval = 2000; // Reset to fast polling on progress
        } else {
          consecutiveNoProgress++;
          // Slow down polling if no progress
          if (consecutiveNoProgress > 5) {
            pollInterval = Math.min(pollInterval * 1.2, 10000);
          }
        }

        // Check for completion
        if (progress.done && progress.outputFile) {
          console.log(`[Lambda] Render completed: ${progress.outputFile}`);
          return progress;
        }

        // Check for errors
        if (progress.fatalErrorEncountered || progress.errors?.length > 0) {
          const errorDetails = progress.errors?.map(err => 
            typeof err === 'object' ? JSON.stringify(err) : String(err)
          ).join(', ') || 'Fatal error encountered';
          throw new Error(`Lambda render failed: ${errorDetails}`);
        }

        // Check if stuck (no progress for too long)
        if (consecutiveNoProgress > 30) { // 30 polls without progress
          throw new Error(`Render appears stuck at ${currentProgress}% - no progress for ${Math.round(consecutiveNoProgress * pollInterval / 1000)} seconds`);
        }

        console.log(`[Lambda] Progress: ${currentProgress}% (${progress.framesRendered || 0} frames rendered)`);

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        if (error instanceof Error && error.message.includes('cancelled')) {
          throw error; // Re-throw cancellation
        }
        
        console.warn(`[Lambda] Progress check failed:`, error);
        // Continue polling on transient errors
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error(`Lambda render timeout after ${Math.round(maxWaitTime / 1000)} seconds`);
  }

  /**
   * Cancel active render
   */
  async cancelRender(videoId: string): Promise<{ success: boolean; message: string }> {
    const renderInfo = this.activeRenders.get(videoId);
    
    if (!renderInfo) {
      return {
        success: false,
        message: 'No active render found for this video ID'
      };
    }

    try {
      // Mark as cancelled locally
      renderInfo.cancelled = true;

      // Attempt to delete the Lambda render
      await deleteRender({
        bucketName: renderInfo.bucketName,
        renderId: renderInfo.renderId,
        region: this.config.region
      });

      this.activeRenders.delete(videoId);
      
      return {
        success: true,
        message: 'Render cancelled successfully'
      };

    } catch (error) {
      console.error(`[Lambda] Failed to cancel render:`, error);
      
      // Still mark as cancelled locally
      this.activeRenders.delete(videoId);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel render'
      };
    }
  }

  /**
   * Get active renders
   */
  getActiveRenders(): string[] {
    return Array.from(this.activeRenders.keys());
  }

  /**
   * Get service status and health
   */
  async getStatus(): Promise<{
    available: boolean;
    message: string;
    activeRenders: number;
    config: Partial<LambdaConfig>;
  }> {
    try {
      return {
        available: true,
        message: `Lambda service ready - Function: ${this.config.functionName}`,
        activeRenders: this.activeRenders.size,
        config: {
          functionName: this.config.functionName,
          region: this.config.region,
          memory: this.config.memory,
          timeout: this.config.timeout
        }
      };
    } catch (error) {
      return {
        available: false,
        message: error instanceof Error ? error.message : 'Service unavailable',
        activeRenders: 0,
        config: {}
      };
    }
  }

  // Helper methods
  private getCompositionId(type: string): string {
    const compositionMap: { [key: string]: string } = {
      story: 'text-story',
      'text-story': 'text-story',
      reddit: 'reddit-video',
      quiz: 'quiz-video',
      educational: 'educational-video'
    };
    return compositionMap[type] || 'text-story';
  }

  private async getServeUrl(): Promise<string> {
    // Get from environment or use deployed site
    const siteUrl = process.env.LAMBDA_SITE_URL;
    if (!siteUrl) {
      throw new Error('LAMBDA_SITE_URL not configured');
    }
    
    // Ensure URL doesn't end with index.html
    return siteUrl.replace(/\/index\.html$/, '/');
  }

  private calculateCost(renderTimeSeconds: number, memoryMB: number): number {
    // AWS Lambda pricing (approximate)
    const requestCost = 0.0000002; // $0.20 per 1M requests
    const durationCost = (renderTimeSeconds * (memoryMB / 1024) * 0.0000166667); // $0.0000166667 per GB-second
    return requestCost + durationCost;
  }

  private estimateTimeRemaining(currentProgress: number, elapsedTime: number): number {
    if (currentProgress <= 0) return 60; // Default estimate
    const progressRate = currentProgress / elapsedTime;
    const remainingProgress = 100 - currentProgress;
    return Math.round(remainingProgress / progressRate);
  }
}

// Singleton instance
export const productionLambdaVideoService = new ProductionLambdaVideoService();
export default ProductionLambdaVideoService;