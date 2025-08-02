/**
 * Simplified Lambda Video Service
 * 
 * Clean implementation matching Clippie's approach:
 * - Simple render initiation
 * - Basic progress polling  
 * - Minimal error handling
 * - Direct S3 output
 */

import { 
  renderMediaOnLambda, 
  getRenderProgress, 
  deleteRender,
  type AwsRegion 
} from '@remotion/lambda';
import { lambdaConfig, type LambdaConfig } from '../config/lambda.config';

// Copy of TextStoryConfig interface from video service to avoid import issues
interface Message {
  id: string;
  text: string;
  sender: 'left' | 'right';
  delay: number;
  avatar?: string;
  voiceId?: string;
  voiceName?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioKey?: string;
  audioTimestamp?: number;
  audioSettings?: {
    stability?: number;
    similarity?: number;
    model?: string;
  };
}

interface TextStoryConfig {
  [key: string]: unknown; // Index signature for Remotion compatibility
  title: string;
  messages: Message[];
  people: {
    left: {
      id: 'left';
      name: string;
      avatar: {
        id: string;
        name: string;
        url: string;
      };
      voiceId?: string;
      voiceName?: string;
      isVoiceGenerated: boolean;
    };
    right: {
      id: 'right';
      name: string;
      avatar: {
        id: string;
        name: string;
        url: string;
      };
      voiceId?: string;
      voiceName?: string;
      isVoiceGenerated: boolean;
    };
  };
  backgroundSettings: any;
  chatOverlay: any;
  uiTheme: string;
  musicVolume: number;
  videoVolume: number;
  colorCustomization: any;
  captions: any;
  notificationSettings: any;
  chatSimulationSettings: any;
  visualEffectsSettings: any;
  voiceAudioSettings: any;
  animationSettings: any;
  advancedSettings?: any;
}

// Proper interface matching video service expectations
export interface RenderRequest {
  id: string;
  inputProps: {
    config?: TextStoryConfig; // Proper config interface from video service
    videoUrl?: string;
    subtitles?: any[];
    BGAudioUrl?: string;
    audioVolume?: number;
    conversations?: any[];
    messageMetadata?: any;
    durationInSeconds?: number;
    bgStart?: number;
    audioStart?: number;
    durationProp?: number;
    flipStyle?: any;
  };
  fileName: string;
  key: string;
  videoId: string;
}

export interface RenderResponse {
  renderId: string;
  bucketName: string;
  cloudWatchLogs: string;
  cloudWatchMainLogs: string;
  folderInS3Console: string;
  lambdaInsightsLogs?: string;
  progressJsonInConsole: string;
}

export interface ProgressRequest {
  id: string;
  bucketName: string;
}

export interface ProgressResponse {
  type: 'progress' | 'done';
  progress?: number;
  url?: string;
  size?: number;
}

/**
 * Simplified Lambda Video Service
 * Clean, Clippie-style implementation
 */
export class SimpleLambdaService {
  private config: LambdaConfig;

  constructor() {
    this.config = lambdaConfig;
    console.log(`[SimpleLambda] Initialized with function: ${this.config.functionName}`);
  }

  /**
   * Start video render - matches Clippie's /api/lambda/render
   */
  async startRender(request: RenderRequest): Promise<RenderResponse> {
    console.log(`[SimpleLambda] Starting render: ${request.id}`);

    try {
      // Validate configuration
      if (!this.config.siteUrl) {
        throw new Error('Lambda site URL not configured. Run deployment first.');
      }

      // Start Lambda render
      const result = await renderMediaOnLambda({
        region: this.config.region,
        functionName: this.config.functionName,
        composition: 'text-story', // Default composition
        serveUrl: this.config.siteUrl,
        inputProps: request.inputProps,
        
        // MAXIMUM PERFORMANCE RENDERING SETTINGS
        codec: this.config.codec,
        crf: this.config.crf,
        concurrencyPerLambda: this.config.concurrencyPerLambda, // 8 (maximum)
        framesPerLambda: this.config.framesPerLambda, // 20 (optimized chunks)
        
        // Output settings
        downloadBehavior: {
          type: 'play-in-browser'
        },
        
        // EXTENDED TIMEOUT & RELIABILITY
        maxRetries: 1, // Let caller handle retries
        timeoutInMilliseconds: this.config.timeout * 1000, // 900s (15 minutes)
        logLevel: 'info'
      });

      console.log(`[SimpleLambda] Render started: ${result.renderId}`);

      // Return Clippie-style response
      return {
        renderId: result.renderId,
        bucketName: result.bucketName,
        cloudWatchLogs: this.generateCloudWatchUrl(result.renderId, 'renderer'),
        cloudWatchMainLogs: this.generateCloudWatchUrl(result.renderId, 'launch'),
        folderInS3Console: this.generateS3ConsoleUrl(result.bucketName, result.renderId),
        progressJsonInConsole: this.generateProgressJsonUrl(result.bucketName, result.renderId)
      };

    } catch (error) {
      console.error(`[SimpleLambda] Render failed:`, error);
      throw new Error(`Lambda render failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get render progress - matches Clippie's /api/lambda/progress
   */
  async getRenderProgress(request: ProgressRequest): Promise<ProgressResponse> {
    try {
      const progress = await getRenderProgress({
        renderId: request.id,
        bucketName: request.bucketName,
        region: this.config.region,
        functionName: this.config.functionName
      });

      // Check if render is complete
      if (progress.done && progress.outputFile) {
        return {
          type: 'done',
          url: progress.outputFile,
          size: progress.outputSizeInBytes || 0
        };
      }

      // Return progress update
      return {
        type: 'progress',
        progress: Math.round((progress.overallProgress || 0) * 100) / 100
      };

    } catch (error) {
      console.error(`[SimpleLambda] Progress check failed:`, error);
      throw new Error(`Progress check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel render
   */
  async cancelRender(renderId: string, bucketName: string): Promise<{ success: boolean; message: string }> {
    try {
      await deleteRender({
        bucketName,
        renderId,
        region: this.config.region
      });

      return {
        success: true,
        message: 'Render cancelled successfully'
      };

    } catch (error) {
      console.error(`[SimpleLambda] Cancel failed:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel render'
      };
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    available: boolean;
    functionName: string;
    region: string;
    memory: number;
    timeout: number;
  } {
    return {
      available: !!this.config.siteUrl,
      functionName: this.config.functionName,
      region: this.config.region,
      memory: this.config.memory,
      timeout: this.config.timeout
    };
  }

  /**
   * Simple render with polling (convenience method)
   */
  async renderAndWait(
    request: RenderRequest,
    onProgress?: (progress: ProgressResponse) => void
  ): Promise<string> {
    // Start render
    const renderResponse = await this.startRender(request);
    
    // Poll for completion
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second polling like Clippie
      
      const progress = await this.getRenderProgress({
        id: renderResponse.renderId,
        bucketName: renderResponse.bucketName
      });
      
      // Notify progress callback
      if (onProgress) {
        onProgress(progress);
      }
      
      // Check if done
      if (progress.type === 'done' && progress.url) {
        return progress.url;
      }
    }
  }

  // Helper methods for generating AWS console URLs
  private generateCloudWatchUrl(renderId: string, type: 'renderer' | 'launch'): string {
    const logGroup = encodeURIComponent(`/aws/lambda/${this.config.functionName}`);
    const filterPattern = encodeURIComponent(`"method=${type},renderId=${renderId}"`);
    return `https://${this.config.region}.console.aws.amazon.com/cloudwatch/home?region=${this.config.region}#logsV2:log-groups/log-group/${logGroup}/log-events?filterPattern=${filterPattern}`;
  }

  private generateS3ConsoleUrl(bucketName: string, renderId: string): string {
    return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${this.config.region}&prefix=renders/${renderId}/`;
  }

  private generateProgressJsonUrl(bucketName: string, renderId: string): string {
    return `https://s3.console.aws.amazon.com/s3/object/${bucketName}?region=${this.config.region}&bucketType=general&prefix=renders/${renderId}/progress.json`;
  }
}

// Singleton instance
export const simpleLambdaService = new SimpleLambdaService();
export default SimpleLambdaService;