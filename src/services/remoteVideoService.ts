import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import type { VideoGenerationRequest, VideoGenerationResult } from './videoService';

export class RemoteVideoService {
  private videoServiceUrl: string;
  private socket: Socket | null = null;
  
  constructor() {
    this.videoServiceUrl = process.env.VIDEO_SERVICE_URL || 'http://localhost:3003';
    console.log(`[RemoteVideoService] Using video service at: ${this.videoServiceUrl}`);
  }

  private connectSocket(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      const socket = io(this.videoServiceUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      socket.on('connect', () => {
        console.log(`[RemoteVideoService] WebSocket connected: ${socket.id}`);
        this.socket = socket;
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        console.error('[RemoteVideoService] WebSocket connection failed:', error);
        reject(error);
      });

      socket.on('disconnect', () => {
        console.log('[RemoteVideoService] WebSocket disconnected');
        this.socket = null;
      });
    });
  }

  async generateVideo(
    request: VideoGenerationRequest,
    onProgress?: (progress: any) => void,
    frontendSocketId?: string
  ): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log('[RemoteVideoService] Starting real-time video generation');
      
      // Get backend's io instance to emit to frontend
      const io = (global as any).io;
      
      const emitToFrontend = (progressData: any) => {
        // Emit to local progress callback
        onProgress?.(progressData);
        
        // Also emit to frontend via WebSocket if socketId provided
        if (frontendSocketId && io) {
          console.log(`[RemoteVideoService] Emitting to frontend ${frontendSocketId}:`, progressData);
          io.to(frontendSocketId).emit('videoProgress', progressData);
        } else {
          console.log(`[RemoteVideoService] No frontend socketId provided (${frontendSocketId}) or io not available`);
        }
      };
      
      // Stage 1: Preparing request
      emitToFrontend({
        phase: 'preparing',
        progress: 5,
        message: 'Connecting to video service...'
      });
      
      // Connect to WebSocket
      const socket = await this.connectSocket();
      
      // Map the request to API format
      const apiRequest = {
        compositionId: this.getCompositionId(request.type),
        inputProps: this.prepareInputProps(request),
        outputOptions: {
          codec: 'h264',
          width: request.settings?.width || 1080,
          height: request.settings?.height || 1920,
          fps: request.settings?.fps || 30,
        },
        socketId: socket.id
      };

      console.log('[RemoteVideoService] Sending request to API with WebSocket:', {
        url: `${this.videoServiceUrl}/api/render`,
        compositionId: apiRequest.compositionId,
        socketId: socket.id
      });

      // Set up real-time progress listener
      const progressPromise = new Promise<any>((resolve, reject) => {
        socket.on('progress', (progressData) => {
          console.log('[RemoteVideoService] Real-time progress:', progressData);
          emitToFrontend(progressData);
          
          if (progressData.phase === 'complete') {
            resolve(progressData);
          }
        });

        socket.on('error', (errorData) => {
          console.error('[RemoteVideoService] WebSocket error:', errorData);
          reject(new Error(errorData.error || 'WebSocket error'));
        });
      });

      // Make API call
      const apiPromise = axios.post(
        `${this.videoServiceUrl}/api/render`,
        apiRequest,
        { timeout: 300000 }
      );

      // Wait for both API response and final progress
      const [response] = await Promise.all([apiPromise, progressPromise]);

      if (response.data.success) {
        console.log('[RemoteVideoService] Real-time video generated successfully');
        
        const videoUrl = response.data.videoUrl || response.data.outputPath;
        
        // Emit final progress with videoUrl to frontend
        emitToFrontend({
          phase: 'complete',
          progress: 100,
          message: 'Video ready!',
          videoUrl: videoUrl
        });
        
        // Disconnect socket after completion
        socket.disconnect();
        this.socket = null;
        
        return {
          success: true,
          outputPath: videoUrl,
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
      console.error('[RemoteVideoService] Real-time generation failed:', error);
      
      // Clean up socket on error
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      return {
        success: false,
        error: error.message || 'Real-time video generation failed',
        renderTimeMs: Date.now() - startTime
      };
    }
  }

  // Legacy method removed - now using real-time WebSocket progress

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