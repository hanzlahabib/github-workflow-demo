import axios from 'axios';
import type { VideoGenerationRequest, VideoGenerationResult } from './videoService';

export class RemoteVideoService {
  private videoServiceUrl: string;
  
  constructor() {
    this.videoServiceUrl = process.env.VIDEO_SERVICE_URL || 'http://localhost:3003';
    console.log(`[RemoteVideoService] Using video service at: ${this.videoServiceUrl}`);
  }

  async generateVideo(
    request: VideoGenerationRequest,
    onProgress?: (progress: any) => void
  ): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log('[RemoteVideoService] Starting remote video generation');
      
      // Stage 1: Preparing request
      onProgress?.({
        phase: 'preparing',
        progress: 5,
        message: 'Preparing video generation request...'
      });
      
      // Map the request to API format
      const apiRequest = {
        compositionId: this.getCompositionId(request.type),
        inputProps: this.prepareInputProps(request),
        outputOptions: {
          codec: 'h264',
          width: request.settings?.width || 1080,
          height: request.settings?.height || 1920,
          fps: request.settings?.fps || 30,
        }
      };

      console.log('[RemoteVideoService] Sending request to API:', {
        url: `${this.videoServiceUrl}/api/render`,
        compositionId: apiRequest.compositionId
      });

      // Stage 2: Uploading request
      onProgress?.({
        phase: 'uploading',
        progress: 10,
        message: 'Sending request to video service...'
      });

      // Make API call with polling for progress
      const response = await this.makeRequestWithProgress(apiRequest, onProgress);

      if (response.data.success) {
        console.log('[RemoteVideoService] Video generated successfully');
        
        // Stage 6: Preparing final URL
        onProgress?.({
          phase: 'finalizing',
          progress: 95,
          message: 'Preparing video URL...'
        });
        
        const videoUrl = response.data.videoUrl || response.data.outputPath;
        
        // Stage 7: Done
        onProgress?.({
          phase: 'complete',
          progress: 100,
          message: 'Video ready!'
        });
        
        return {
          success: true,
          outputPath: videoUrl, // Use the correct video URL
          videoUrl: videoUrl,
          durationInSeconds: response.data.composition.durationInFrames / response.data.composition.fps,
          width: response.data.composition.width,
          height: response.data.composition.height,
          renderTimeMs: Date.now() - startTime,
        };
      } else {
        throw new Error(response.data.error || 'Remote video generation failed');
      }
      
    } catch (error) {
      console.error('[RemoteVideoService] Generation failed:', error);
      
      return {
        success: false,
        error: error.message || 'Remote video generation failed',
        renderTimeMs: Date.now() - startTime
      };
    }
  }

  private async makeRequestWithProgress(
    apiRequest: any,
    onProgress?: (progress: any) => void
  ): Promise<any> {
    // Stage 3: Rendering
    onProgress?.({
      phase: 'rendering',
      progress: 15,
      message: 'Starting video rendering...'
    });

    // Start the actual request
    const requestPromise = axios.post(
      `${this.videoServiceUrl}/api/render`,
      apiRequest,
      {
        timeout: 300000, // 5 minutes
      }
    );

    // Simulate progress updates while waiting for response
    const progressInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - Date.now()) / 1000;
      
      // Simulate realistic progress stages
      if (Math.random() > 0.7) { // Random progress updates
        const randomProgress = 15 + Math.floor(Math.random() * 70); // 15-85%
        const messages = [
          'Rendering video frames...',
          'Processing visual effects...',
          'Applying text animations...',
          'Encoding video...',
          'Optimizing quality...'
        ];
        
        onProgress?.({
          phase: 'rendering',
          progress: Math.min(randomProgress, 85),
          message: messages[Math.floor(Math.random() * messages.length)]
        });
      }
    }, 2000); // Update every 2 seconds

    try {
      const response = await requestPromise;
      clearInterval(progressInterval);
      
      // Stage 4: Upload/Storage
      if (response.data.success) {
        onProgress?.({
          phase: 'uploading',
          progress: 90,
          message: response.data.r2Url ? 'Uploading to cloud storage...' : 'Preparing video file...'
        });
        
        // Small delay to show upload progress
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return response;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  private getCompositionId(type: string): string {
    const compositionMap = {
      'story': 'text-story',
      'reddit': 'single-speaker-focus',
      'quiz': 'triple-panel-analysis',
      'educational': 'single-speaker-focus',
      'text-story': 'text-story'
    };
    
    return compositionMap[type] || 'text-story';
  }

  private prepareInputProps(request: VideoGenerationRequest): any {
    const { input, settings, type } = request;
    
    // For text-story, use the config directly
    if (type === 'text-story' && input.config) {
      return {
        config: input.config,
        duration: settings?.duration || 10
      };
    }
    
    // For other types, prepare standard props
    return {
      title: input.title || 'Untitled',
      script: input.script || input.text || '',
      duration: settings?.duration || 30,
      width: settings?.width || 1080,
      height: settings?.height || 1920,
      ...input
    };
  }
}

export const remoteVideoService = new RemoteVideoService();