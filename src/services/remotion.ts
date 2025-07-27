import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export interface RemotionConfig {
  compositionsPath: string; // Path to Remotion compositions
  outputDir: string; // Directory for rendered videos
  lambdaRegion?: string; // AWS Lambda region for cloud rendering
  lambdaRole?: string; // AWS Lambda execution role
  lambdaTimeout?: number; // Lambda timeout in seconds
  concurrency?: number; // Number of concurrent render processes
  quality?: number; // Video quality (1-100)
  crf?: number; // Constant Rate Factor for video compression
}

export interface RenderRequest {
  compositionId: string; // Which composition to render
  inputProps?: any; // Props to pass to the composition
  outputFileName?: string; // Custom output filename
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores';
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
  imageFormat?: 'jpeg' | 'png';
  quality?: number;
  crf?: number;
  pixelFormat?: 'yuv420p' | 'yuv422p' | 'yuv444p' | 'yuv420p10le' | 'yuv422p10le' | 'yuv444p10le';
  proResProfile?: 'standard' | 'hq' | 'lt' | 'proxy' | '4444' | '4444-xq';
  scale?: number;
  everyNthFrame?: number;
  numberOfGifLoops?: number;
  envVariables?: { [key: string]: string };
  chromiumOptions?: {
    disableWebSecurity?: boolean;
    ignoreCertificateErrors?: boolean;
    headless?: boolean;
    gl?: 'swiftshader' | 'angle' | 'egl' | 'desktop';
  };
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  category: 'story' | 'reddit' | 'quiz' | 'educational' | 'viral' | 'social';
  defaultProps: any;
  duration: number; // in seconds
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  supportedLanguages: string[];
  customizable: {
    text: boolean;
    colors: boolean;
    fonts: boolean;
    images: boolean;
    audio: boolean;
    animations: boolean;
  };
}

export interface RenderProgress {
  phase: 'downloading' | 'rendering' | 'encoding' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  frameCount?: number;
  totalFrames?: number;
  fps?: number;
  timeRemaining?: number; // in seconds
  currentFrame?: number;
  message?: string;
  error?: string;
}

export interface RenderResult {
  outputPath: string;
  sizeInBytes: number;
  durationInSeconds: number;
  fps: number;
  width: number;
  height: number;
  codec: string;
  renderTime: number; // in seconds
  success: boolean;
  error?: string;
}

export interface StoryVideoProps {
  script: string;
  scenes: Array<{
    text: string;
    duration: number;
    background?: string; // image URL or color
    voiceUrl?: string; // audio URL
    animation?: 'fadeIn' | 'slideIn' | 'zoomIn' | 'typewriter';
  }>;
  style: {
    fontSize: number;
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    alignment: 'left' | 'center' | 'right';
  };
  audio?: {
    backgroundMusic?: string;
    volume: number;
  };
}

export interface RedditVideoProps {
  post: {
    title: string;
    content: string;
    author: string;
    subreddit: string;
    upvotes: number;
    comments: number;
  };
  comments?: Array<{
    author: string;
    content: string;
    upvotes: number;
    replies?: Array<{
      author: string;
      content: string;
      upvotes: number;
    }>;
  }>;
  style: {
    theme: 'dark' | 'light';
    accentColor: string;
    fontFamily: string;
  };
  voiceSettings: {
    titleVoice?: string;
    contentVoice?: string;
    commentsVoice?: string;
  };
}

export interface QuizVideoProps {
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
    timeLimit?: number; // seconds
  }>;
  style: {
    theme: 'modern' | 'retro' | 'minimalist' | 'colorful';
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  transitions: {
    questionTransition: 'fade' | 'slide' | 'zoom' | 'flip';
    answerReveal: 'instant' | 'countdown' | 'cascade';
  };
  audio: {
    backgroundMusic?: string;
    correctSound?: string;
    incorrectSound?: string;
    tickingSound?: string;
  };
}

// Available video templates
export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: 'story-minimal',
    name: 'Minimal Story',
    description: 'Clean, minimal design for storytelling videos',
    category: 'story',
    defaultProps: {
      style: {
        fontSize: 48,
        fontFamily: 'Inter',
        textColor: '#ffffff',
        backgroundColor: '#000000',
        alignment: 'center',
      },
    },
    duration: 60,
    aspectRatio: '9:16',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'ur', 'hi', 'ar'],
    customizable: {
      text: true,
      colors: true,
      fonts: true,
      images: true,
      audio: true,
      animations: true,
    },
  },
  {
    id: 'reddit-dark',
    name: 'Reddit Dark Theme',
    description: 'Dark theme Reddit-style video template',
    category: 'reddit',
    defaultProps: {
      style: {
        theme: 'dark',
        accentColor: '#ff4500',
        fontFamily: 'Roboto',
      },
    },
    duration: 90,
    aspectRatio: '9:16',
    supportedLanguages: ['en'],
    customizable: {
      text: true,
      colors: true,
      fonts: false,
      images: false,
      audio: true,
      animations: false,
    },
  },
  {
    id: 'quiz-modern',
    name: 'Modern Quiz',
    description: 'Modern, animated quiz template with smooth transitions',
    category: 'quiz',
    defaultProps: {
      style: {
        theme: 'modern',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        fontFamily: 'Poppins',
      },
      transitions: {
        questionTransition: 'slide',
        answerReveal: 'countdown',
      },
    },
    duration: 120,
    aspectRatio: '9:16',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'ur', 'hi'],
    customizable: {
      text: true,
      colors: true,
      fonts: true,
      images: true,
      audio: true,
      animations: true,
    },
  },
  {
    id: 'educational-professional',
    name: 'Professional Educational',
    description: 'Professional layout for educational content',
    category: 'educational',
    defaultProps: {
      style: {
        fontSize: 42,
        fontFamily: 'Source Sans Pro',
        textColor: '#1f2937',
        backgroundColor: '#f8fafc',
        alignment: 'left',
      },
    },
    duration: 180,
    aspectRatio: '16:9',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'ur', 'hi', 'ar', 'zh', 'ja'],
    customizable: {
      text: true,
      colors: true,
      fonts: true,
      images: true,
      audio: true,
      animations: true,
    },
  },
];

class RemotionService {
  private config: RemotionConfig;
  private activeRenders: Map<string, any> = new Map();

  constructor(config: RemotionConfig) {
    this.config = {
      lambdaTimeout: 300,
      concurrency: 4,
      quality: 80,
      crf: 18,
      ...config,
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async renderVideo(request: RenderRequest, onProgress?: (progress: RenderProgress) => void): Promise<RenderResult> {
    const renderId = this.generateRenderId();

    try {
      console.log(`[Remotion] Starting render: ${renderId} - ${request.compositionId}`);

      const startTime = Date.now();
      const outputPath = this.getOutputPath(request, renderId);

      if (onProgress) {
        onProgress({
          phase: 'downloading',
          progress: 5,
          message: 'Preparing render environment...',
        });
      }

      // Build render command
      const renderCommand = this.buildRenderCommand(request, outputPath);

      if (onProgress) {
        onProgress({
          phase: 'rendering',
          progress: 10,
          message: 'Starting video render...',
        });
      }

      // Execute render
      const result = await this.executeRender(renderCommand, onProgress);

      if (!result.success) {
        throw new Error(result.error || 'Render failed');
      }

      // Get output file stats
      const stats = fs.statSync(outputPath);
      const renderTime = (Date.now() - startTime) / 1000;

      // Get video metadata
      const metadata = await this.getVideoMetadata(outputPath);

      const renderResult: RenderResult = {
        outputPath,
        sizeInBytes: stats.size,
        durationInSeconds: metadata.duration,
        fps: metadata.fps,
        width: metadata.width,
        height: metadata.height,
        codec: request.codec || 'h264',
        renderTime,
        success: true,
      };

      if (onProgress) {
        onProgress({
          phase: 'completed',
          progress: 100,
          message: 'Render completed successfully!',
        });
      }

      console.log(`[Remotion] Render completed: ${renderId} in ${renderTime}s`);
      return renderResult;
    } catch (error) {
      console.error(`[Remotion] Render failed: ${renderId}:`, error);

      if (onProgress) {
        onProgress({
          phase: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return {
        outputPath: '',
        sizeInBytes: 0,
        durationInSeconds: 0,
        fps: 0,
        width: 0,
        height: 0,
        codec: '',
        renderTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.activeRenders.delete(renderId);
    }
  }

  async renderStoryVideo(props: StoryVideoProps, options: Partial<RenderRequest> = {}): Promise<RenderResult> {
    return this.renderVideo({
      compositionId: 'text-story',
      inputProps: props,
      codec: 'h264',
      width: 1080,
      height: 1920, // 9:16 aspect ratio
      fps: 30,
      quality: 90,
      ...options,
    });
  }

  async renderRedditVideo(props: RedditVideoProps, options: Partial<RenderRequest> = {}): Promise<RenderResult> {
    return this.renderVideo({
      compositionId: 'reddit-video',
      inputProps: props,
      codec: 'h264',
      width: 1080,
      height: 1920, // 9:16 aspect ratio
      fps: 30,
      quality: 85,
      ...options,
    });
  }

  async renderQuizVideo(props: QuizVideoProps, options: Partial<RenderRequest> = {}): Promise<RenderResult> {
    const estimatedDuration = props.questions.length * 15; // ~15 seconds per question
    const durationInFrames = estimatedDuration * 30; // 30 fps

    return this.renderVideo({
      compositionId: 'quiz-video',
      inputProps: props,
      codec: 'h264',
      width: 1080,
      height: 1920, // 9:16 aspect ratio
      fps: 30,
      durationInFrames,
      quality: 90,
      ...options,
    });
  }

  async renderFromTemplate(
    templateId: string,
    customProps: any,
    options: Partial<RenderRequest> = {}
  ): Promise<RenderResult> {
    const template = VIDEO_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Merge template defaults with custom props
    const inputProps = {
      ...template.defaultProps,
      ...customProps,
    };

    // Set aspect ratio based on template
    const [width, height] = this.getResolutionFromAspectRatio(template.aspectRatio);

    return this.renderVideo({
      compositionId: templateId,
      inputProps,
      codec: 'h264',
      width,
      height,
      fps: 30,
      quality: this.config.quality,
      ...options,
    });
  }

  async renderOnLambda(request: RenderRequest): Promise<RenderResult> {
    if (!this.config.lambdaRegion || !this.config.lambdaRole) {
      throw new Error('Lambda configuration missing. Set lambdaRegion and lambdaRole.');
    }

    try {
      console.log('[Remotion] Starting Lambda render');

      // This would integrate with Remotion Lambda
      // For now, we'll fall back to local rendering
      console.warn('[Remotion] Lambda rendering not implemented yet, falling back to local');
      return this.renderVideo(request);
    } catch (error) {
      console.error('[Remotion] Lambda render failed:', error);
      throw new Error(`Lambda render failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getAvailableTemplates(): VideoTemplate[] {
    return VIDEO_TEMPLATES;
  }

  getTemplate(templateId: string): VideoTemplate | undefined {
    return VIDEO_TEMPLATES.find(t => t.id === templateId);
  }

  getTemplatesByCategory(category: VideoTemplate['category']): VideoTemplate[] {
    return VIDEO_TEMPLATES.filter(t => t.category === category);
  }

  async getCompositions(): Promise<Array<{ id: string; width: number; height: number; fps: number; durationInFrames: number }>> {
    try {
      console.log('[Remotion] Getting available compositions');

      // Execute remotion compositions command
      const output = execSync(`npx remotion compositions ${this.config.compositionsPath}`, {
        encoding: 'utf8',
        cwd: this.config.compositionsPath,
      });

      // Parse the output (this would depend on the actual Remotion CLI output format)
      // For now, return mock compositions
      return [
        { id: 'text-story', width: 1080, height: 1920, fps: 30, durationInFrames: 1800 },
        { id: 'reddit-video', width: 1080, height: 1920, fps: 30, durationInFrames: 2700 },
        { id: 'quiz-video', width: 1080, height: 1920, fps: 30, durationInFrames: 3600 },
      ];
    } catch (error) {
      console.error('[Remotion] Failed to get compositions:', error);
      return [];
    }
  }

  cancelRender(renderId: string): boolean {
    const renderProcess = this.activeRenders.get(renderId);
    if (renderProcess) {
      renderProcess.kill();
      this.activeRenders.delete(renderId);
      console.log(`[Remotion] Render cancelled: ${renderId}`);
      return true;
    }
    return false;
  }

  private buildRenderCommand(request: RenderRequest, outputPath: string): string {
    const args: string[] = [
      'npx', 'remotion', 'render',
      this.config.compositionsPath,
      request.compositionId,
      outputPath,
    ];

    if (request.codec) args.push('--codec', request.codec);
    if (request.width) args.push('--width', request.width.toString());
    if (request.height) args.push('--height', request.height.toString());
    if (request.fps) args.push('--fps', request.fps.toString());
    if (request.durationInFrames) args.push('--frames', request.durationInFrames.toString());
    if (request.quality) args.push('--quality', request.quality.toString());
    if (request.crf) args.push('--crf', request.crf.toString());
    if (request.pixelFormat) args.push('--pixel-format', request.pixelFormat);
    if (request.scale) args.push('--scale', request.scale.toString());
    if (request.everyNthFrame) args.push('--every-nth-frame', request.everyNthFrame.toString());

    // Add input props as environment variables or props file
    if (request.inputProps) {
      const propsFile = path.join(this.config.outputDir, `props-${Date.now()}.json`);
      fs.writeFileSync(propsFile, JSON.stringify(request.inputProps));
      args.push('--props', propsFile);
    }

    // Add environment variables
    if (request.envVariables) {
      Object.entries(request.envVariables).forEach(([key, value]) => {
        args.push('--env', `${key}=${value}`);
      });
    }

    // Add Chromium options
    if (request.chromiumOptions) {
      if (request.chromiumOptions.disableWebSecurity) {
        args.push('--disable-web-security');
      }
      if (request.chromiumOptions.ignoreCertificateErrors) {
        args.push('--ignore-certificate-errors');
      }
      if (request.chromiumOptions.gl) {
        args.push('--gl', request.chromiumOptions.gl);
      }
    }

    // Add concurrency
    args.push('--concurrency', this.config.concurrency!.toString());

    return args.join(' ');
  }

  private async executeRender(command: string, onProgress?: (progress: RenderProgress) => void): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const args = command.split(' ');
      const process = spawn(args[0], args.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.config.compositionsPath,
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
        if (onProgress) {
          // Parse progress from output (this would depend on Remotion's actual output format)
          const progressMatch = output.match(/(\d+)\/(\d+)/);
          if (progressMatch) {
            const current = parseInt(progressMatch[1]);
            const total = parseInt(progressMatch[2]);
            const progress = Math.round((current / total) * 80) + 10; // 10-90%

            onProgress({
              phase: 'rendering',
              progress,
              currentFrame: current,
              totalFrames: total,
              message: `Rendering frame ${current} of ${total}`,
            });
          }
        }
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          if (onProgress) {
            onProgress({
              phase: 'encoding',
              progress: 95,
              message: 'Finalizing video...',
            });
          }
          resolve({ success: true });
        } else {
          resolve({ success: false, error: errorOutput || 'Render process failed' });
        }
      });

      process.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  private async getVideoMetadata(filePath: string): Promise<{ duration: number; fps: number; width: number; height: number }> {
    try {
      // Use ffprobe to get video metadata
      const output = execSync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
        { encoding: 'utf8' }
      );

      const metadata = JSON.parse(output);
      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');

      return {
        duration: parseFloat(metadata.format.duration) || 0,
        fps: eval(videoStream.r_frame_rate) || 30,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
      };
    } catch (error) {
      console.warn('[Remotion] Failed to get video metadata:', error);
      return { duration: 0, fps: 30, width: 0, height: 0 };
    }
  }

  private getOutputPath(request: RenderRequest, renderId: string): string {
    const fileName = request.outputFileName || `${request.compositionId}-${renderId}.mp4`;
    return path.join(this.config.outputDir, fileName);
  }

  private generateRenderId(): string {
    return `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getResolutionFromAspectRatio(aspectRatio: string): [number, number] {
    switch (aspectRatio) {
      case '16:9':
        return [1920, 1080];
      case '9:16':
        return [1080, 1920];
      case '1:1':
        return [1080, 1080];
      case '4:3':
        return [1440, 1080];
      default:
        return [1080, 1920];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test if Remotion CLI is available
      execSync('npx remotion --version', { stdio: 'ignore' });

      // Test if compositions path exists
      if (!fs.existsSync(this.config.compositionsPath)) {
        console.error('[Remotion] Compositions path does not exist:', this.config.compositionsPath);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Remotion] Connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let remotionInstance: RemotionService | null = null;

export const createRemotionService = (config: RemotionConfig): RemotionService => {
  if (!remotionInstance) {
    remotionInstance = new RemotionService(config);
  }
  return remotionInstance;
};

export const getRemotionService = (): RemotionService => {
  if (!remotionInstance) {
    throw new Error('Remotion service not initialized. Call createRemotionService first.');
  }
  return remotionInstance;
};

export default RemotionService;
