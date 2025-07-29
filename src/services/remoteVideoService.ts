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

      // Make API call
      const response = await axios.post(
        `${this.videoServiceUrl}/api/render`,
        apiRequest,
        {
          timeout: 300000, // 5 minutes
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress?.({
                phase: 'uploading',
                progress,
                message: `Uploading: ${progress}%`
              });
            }
          }
        }
      );

      if (response.data.success) {
        console.log('[RemoteVideoService] Video generated successfully');
        
        return {
          success: true,
          outputPath: response.data.outputPath,
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

  private getCompositionId(type: string): string {
    const compositionMap = {
      'story': 'ConfigurableNewsVideo',
      'reddit': 'ConfigurableNewsVideo',
      'quiz': 'ConfigurableNewsVideo',
      'educational': 'ConfigurableNewsVideo',
      'text-story': 'CleanTextStoryComposition'
    };
    
    return compositionMap[type] || 'ConfigurableNewsVideo';
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