import OpenAI from 'openai';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export interface DalleConfig {
  apiKey: string;
  organization?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: 'dall-e-2' | 'dall-e-3';
  n?: number; // Number of images (1-10 for DALL-E 2, only 1 for DALL-E 3)
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd'; // Only for DALL-E 3
  style?: 'vivid' | 'natural'; // Only for DALL-E 3
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageEditRequest {
  image: string | Buffer | File; // Original image
  mask?: string | Buffer | File; // Mask image (optional)
  prompt: string;
  model?: 'dall-e-2';
  n?: number; // 1-10
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageVariationRequest {
  image: string | Buffer | File; // Original image
  model?: 'dall-e-2';
  n?: number; // 1-10
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface GeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string; // For DALL-E 3
}

export interface ImageGenerationResponse {
  created: number;
  data: GeneratedImage[];
}

export interface VideoBackgroundRequest {
  theme: 'nature' | 'city' | 'abstract' | 'space' | 'underwater' | 'historical' | 'futuristic' | 'fantasy';
  mood: 'calm' | 'energetic' | 'mysterious' | 'bright' | 'dark' | 'colorful' | 'minimal';
  style: 'realistic' | 'artistic' | 'cartoon' | 'cinematic' | 'illustration';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  description?: string;
}

export interface ThumbnailRequest {
  title: string;
  style: 'youtube' | 'tiktok' | 'instagram' | 'professional' | 'casual' | 'gaming';
  emotion: 'excited' | 'shocked' | 'curious' | 'happy' | 'serious' | 'dramatic';
  colorScheme?: string;
  includeText?: boolean;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
}

export interface StoryIllustrationRequest {
  sceneDescription: string;
  characterCount: number;
  setting: 'indoor' | 'outdoor' | 'fantasy' | 'modern' | 'historical' | 'futuristic';
  artStyle: 'realistic' | 'cartoon' | 'anime' | 'comic' | 'watercolor' | 'digital art';
  mood: 'happy' | 'sad' | 'exciting' | 'mysterious' | 'romantic' | 'dramatic';
  aspectRatio: '16:9' | '9:16' | '1:1';
}

class DalleService {
  private client: OpenAI;
  private maxRetries: number;
  private timeout: number;

  constructor(config: DalleConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000,
    });
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 60000;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      console.log(`[DALL-E] Generating ${request.n || 1} image(s) with prompt: ${request.prompt.substring(0, 50)}...`);

      const response = await this.client.images.generate({
        model: request.model || 'dall-e-3',
        prompt: request.prompt,
        n: request.n || 1,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        style: request.style || 'vivid',
        response_format: request.response_format || 'url',
        user: request.user,
      });

      console.log(`[DALL-E] Successfully generated ${(response.data as any).length} image(s)`);
      return response as any;
    } catch (error) {
      console.error('[DALL-E] Image generation failed:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async editImage(request: ImageEditRequest): Promise<ImageGenerationResponse> {
    try {
      console.log('[DALL-E] Editing image with prompt:', request.prompt.substring(0, 50) + '...');

      // Prepare image files
      const imageFile = await this.prepareImageFile(request.image, 'image.png');
      const maskFile = request.mask ? await this.prepareImageFile(request.mask, 'mask.png') : undefined;

      const response = await this.client.images.edit({
        model: request.model || 'dall-e-2',
        image: imageFile,
        mask: maskFile,
        prompt: request.prompt,
        n: request.n || 1,
        size: request.size || '1024x1024',
        response_format: request.response_format || 'url',
        user: request.user,
      });

      console.log(`[DALL-E] Successfully edited image`);
      return response as any;
    } catch (error) {
      console.error('[DALL-E] Image editing failed:', error);
      throw new Error(`Image editing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createImageVariation(request: ImageVariationRequest): Promise<ImageGenerationResponse> {
    try {
      console.log('[DALL-E] Creating image variations');

      const imageFile = await this.prepareImageFile(request.image, 'image.png');

      const response = await this.client.images.createVariation({
        model: request.model || 'dall-e-2',
        image: imageFile,
        n: request.n || 1,
        size: request.size || '1024x1024',
        response_format: request.response_format || 'url',
        user: request.user,
      });

      console.log(`[DALL-E] Successfully created ${(response.data as any).length} variation(s)`);
      return response as any;
    } catch (error) {
      console.error('[DALL-E] Image variation failed:', error);
      throw new Error(`Image variation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateVideoBackground(request: VideoBackgroundRequest): Promise<GeneratedImage> {
    try {
      console.log(`[DALL-E] Generating video background: ${request.theme} theme`);

      const prompt = this.buildBackgroundPrompt(request);
      const size = this.getOptimalSize(request.aspectRatio);

      const response = await this.generateImage({
        prompt,
        model: 'dall-e-3',
        size,
        quality: 'hd',
        style: 'vivid',
        n: 1,
      });

      return (response.data as any)[0];
    } catch (error) {
      console.error('[DALL-E] Video background generation failed:', error);
      throw new Error(`Video background generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateThumbnail(request: ThumbnailRequest): Promise<GeneratedImage> {
    try {
      console.log(`[DALL-E] Generating ${request.style} thumbnail for: ${request.title}`);

      const prompt = this.buildThumbnailPrompt(request);
      const size = this.getOptimalSize(request.aspectRatio);

      const response = await this.generateImage({
        prompt,
        model: 'dall-e-3',
        size,
        quality: 'hd',
        style: 'vivid',
        n: 1,
      });

      return (response.data as any)[0];
    } catch (error) {
      console.error('[DALL-E] Thumbnail generation failed:', error);
      throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStoryIllustration(request: StoryIllustrationRequest): Promise<GeneratedImage> {
    try {
      console.log('[DALL-E] Generating story illustration');

      const prompt = this.buildStoryPrompt(request);
      const size = this.getOptimalSize(request.aspectRatio);

      const response = await this.generateImage({
        prompt,
        model: 'dall-e-3',
        size,
        quality: 'hd',
        style: request.artStyle === 'realistic' ? 'natural' : 'vivid',
        n: 1,
      });

      return (response.data as any)[0];
    } catch (error) {
      console.error('[DALL-E] Story illustration generation failed:', error);
      throw new Error(`Story illustration generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadImage(imageUrl: string, filePath: string): Promise<string> {
    try {
      console.log(`[DALL-E] Downloading image to: ${filePath}`);

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);
      console.log(`[DALL-E] Image saved successfully`);

      return filePath;
    } catch (error) {
      console.error('[DALL-E] Image download failed:', error);
      throw new Error(`Image download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveBase64Image(base64Data: string, filePath: string): Promise<string> {
    try {
      console.log(`[DALL-E] Saving base64 image to: ${filePath}`);

      const buffer = Buffer.from(base64Data, 'base64');

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);
      console.log(`[DALL-E] Base64 image saved successfully`);

      return filePath;
    } catch (error) {
      console.error('[DALL-E] Base64 image save failed:', error);
      throw new Error(`Base64 image save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildBackgroundPrompt(request: VideoBackgroundRequest): string {
    const themeDescriptions = {
      nature: 'beautiful natural landscape with lush greenery, mountains, and flowing water',
      city: 'modern urban cityscape with skyscrapers, lights, and dynamic architecture',
      abstract: 'abstract geometric patterns with flowing shapes and gradients',
      space: 'cosmic space scene with stars, nebulae, and celestial bodies',
      underwater: 'serene underwater scene with coral reefs, marine life, and blue depths',
      historical: 'classical historical setting with ancient architecture and timeless elements',
      futuristic: 'futuristic sci-fi environment with advanced technology and neon lights',
      fantasy: 'magical fantasy realm with mystical elements and enchanting atmosphere'
    };

    const moodDescriptions = {
      calm: 'peaceful, serene, and tranquil atmosphere',
      energetic: 'dynamic, vibrant, and high-energy feeling',
      mysterious: 'enigmatic, shadowy, and intriguing ambiance',
      bright: 'well-lit, cheerful, and optimistic tone',
      dark: 'dramatic, moody, and atmospheric lighting',
      colorful: 'rich, saturated colors and vivid palette',
      minimal: 'clean, simple, and uncluttered design'
    };

    const styleDescriptions = {
      realistic: 'photorealistic, detailed, and lifelike',
      artistic: 'painterly, expressive, and creative',
      cartoon: 'stylized, animated, and playful',
      cinematic: 'movie-quality, dramatic lighting, and professional composition',
      illustration: 'hand-drawn, artistic, and illustrative style'
    };

    let prompt = `A ${styleDescriptions[request.style]} ${themeDescriptions[request.theme]} with ${moodDescriptions[request.mood]}`;

    if (request.description) {
      prompt += `. ${request.description}`;
    }

    prompt += '. High quality, professional composition, suitable for video background. No text or watermarks.';

    return prompt;
  }

  private buildThumbnailPrompt(request: ThumbnailRequest): string {
    const styleDescriptions = {
      youtube: 'YouTube-style thumbnail with bold, eye-catching design',
      tiktok: 'TikTok-style thumbnail with trendy, social media aesthetics',
      instagram: 'Instagram-style thumbnail with clean, modern design',
      professional: 'professional, clean, and sophisticated design',
      casual: 'casual, friendly, and approachable style',
      gaming: 'gaming-style thumbnail with dynamic, exciting elements'
    };

    const emotionDescriptions = {
      excited: 'enthusiastic, energetic, and thrilling expression',
      shocked: 'surprised, amazed, and astonished reaction',
      curious: 'intrigued, questioning, and investigative mood',
      happy: 'joyful, positive, and uplifting atmosphere',
      serious: 'professional, focused, and important tone',
      dramatic: 'intense, powerful, and impactful feeling'
    };

    let prompt = `A ${styleDescriptions[request.style]} representing "${request.title}" with ${emotionDescriptions[request.emotion]}`;

    if (request.colorScheme) {
      prompt += ` using ${request.colorScheme} color palette`;
    }

    if (request.includeText) {
      prompt += `. Include space for text overlay`;
    }

    prompt += '. High contrast, visually striking, optimized for small display sizes. Professional quality.';

    return prompt;
  }

  private buildStoryPrompt(request: StoryIllustrationRequest): string {
    const settingDescriptions = {
      indoor: 'interior setting with detailed room elements',
      outdoor: 'outdoor environment with natural elements',
      fantasy: 'magical fantasy world with mystical elements',
      modern: 'contemporary modern setting',
      historical: 'historical period setting with authentic details',
      futuristic: 'futuristic sci-fi environment'
    };

    const artStyleDescriptions = {
      realistic: 'photorealistic, detailed, and lifelike',
      cartoon: 'cartoon-style, animated, and stylized',
      anime: 'anime-style with characteristic features',
      comic: 'comic book style with bold lines and colors',
      watercolor: 'watercolor painting style with soft, flowing colors',
      'digital art': 'digital art style with clean, precise details'
    };

    const moodDescriptions = {
      happy: 'joyful, bright, and positive atmosphere',
      sad: 'melancholic, somber, and emotional tone',
      exciting: 'thrilling, dynamic, and energetic mood',
      mysterious: 'enigmatic, shadowy, and intriguing ambiance',
      romantic: 'romantic, warm, and intimate feeling',
      dramatic: 'intense, powerful, and theatrical atmosphere'
    };

    let prompt = `${artStyleDescriptions[request.artStyle]} illustration of ${request.sceneDescription}`;

    if (request.characterCount > 0) {
      prompt += ` featuring ${request.characterCount} character${request.characterCount > 1 ? 's' : ''}`;
    }

    prompt += ` in a ${settingDescriptions[request.setting]} with ${moodDescriptions[request.mood]}`;
    prompt += '. Professional illustration quality, suitable for storytelling. Clear composition and engaging visuals.';

    return prompt;
  }

  private getOptimalSize(aspectRatio: string): '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792' {
    switch (aspectRatio) {
      case '16:9':
        return '1792x1024';
      case '9:16':
        return '1024x1792';
      case '1:1':
        return '1024x1024';
      case '4:3':
        return '1024x1024'; // Closest available option
      default:
        return '1024x1024';
    }
  }

  private async prepareImageFile(image: string | Buffer | File, fileName: string): Promise<File> {
    if (typeof image === 'string') {
      // File path
      if (!fs.existsSync(image)) {
        throw new Error(`Image file not found: ${image}`);
      }
      const imageBuffer = fs.readFileSync(image);
      return new File([imageBuffer], fileName, { type: 'image/png' });
    } else if (Buffer.isBuffer(image)) {
      // Buffer
      return new File([image], fileName, { type: 'image/png' });
    } else {
      // Already a File object
      return image as File;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generateImage({
        prompt: 'A simple test image',
        model: 'dall-e-2',
        size: '256x256',
        n: 1,
      });
      return true;
    } catch (error) {
      console.error('[DALL-E] Connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let dalleInstance: DalleService | null = null;

export const createDalleService = (config: DalleConfig): DalleService => {
  if (!dalleInstance) {
    dalleInstance = new DalleService(config);
  }
  return dalleInstance;
};

export const getDalleService = (): DalleService => {
  if (!dalleInstance) {
    throw new Error('DALL-E service not initialized. Call createDalleService first.');
  }
  return dalleInstance;
};

export default DalleService;
