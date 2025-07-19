import { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';

export interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface Voice {
  voice_id: string;
  name: string;
  samples?: Array<{
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    hash: string;
  }>;
  category?: string;
  labels: Record<string, string>;
  description?: string;
  preview_url?: string;
  available_for_tiers: string[];
  settings?: any;
  high_quality_base_model_ids: string[];
  safety_control?: string;
}

export interface TextToSpeechRequest {
  text: string;
  voice_id: string;
  voice_settings?: any;
  language_code?: string;
  model_id?: string;
  output_format?: string;
}

export interface AudioGenerationResponse {
  audio_data: Buffer;
  content_type: string;
  filename: string;
  duration_ms?: number;
}

export interface VoicesListResponse {
  voices: Voice[];
  has_more: boolean;
  last_sort_id?: string;
}

export interface SupportedLanguage {
  language_id: string;
  name: string;
  native_name: string;
  accent_support: boolean;
}

// Predefined voices for different languages and use cases
export const VOICE_PRESETS = {
  english: {
    male: {
      professional: 'pNInz6obpgDQGcFmaJgB', // Adam
      casual: '29vD33N1CtxCmqQRPOHJ', // Drew
      energetic: 'JBFqnCBsd6RMkjVDRZzb', // George
    },
    female: {
      professional: 'AZnzlk1XvdvUeBnXmlld', // Domi
      casual: 'EXAVITQu4vr4xnSDxMaL', // Sarah
      warm: 'oWAxZDx7w5VEj9dCyTzz', // Grace
    }
  },
  spanish: {
    male: {
      professional: 'VR6AewLTigWG4xSOukaG', // Arnold
    },
    female: {
      casual: 'XrExE9yKIg1WjnnlVkGX', // Matilda
    }
  },
  urdu: {
    male: {
      professional: 'custom_urdu_male_1',
    },
    female: {
      casual: 'custom_urdu_female_1',
    }
  }
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { language_id: 'en', name: 'English', native_name: 'English', accent_support: true },
  { language_id: 'es', name: 'Spanish', native_name: 'Español', accent_support: true },
  { language_id: 'fr', name: 'French', native_name: 'Français', accent_support: true },
  { language_id: 'de', name: 'German', native_name: 'Deutsch', accent_support: true },
  { language_id: 'it', name: 'Italian', native_name: 'Italiano', accent_support: true },
  { language_id: 'pt', name: 'Portuguese', native_name: 'Português', accent_support: true },
  { language_id: 'pl', name: 'Polish', native_name: 'Polski', accent_support: true },
  { language_id: 'tr', name: 'Turkish', native_name: 'Türkçe', accent_support: true },
  { language_id: 'ru', name: 'Russian', native_name: 'Русский', accent_support: true },
  { language_id: 'nl', name: 'Dutch', native_name: 'Nederlands', accent_support: true },
  { language_id: 'cs', name: 'Czech', native_name: 'Čeština', accent_support: false },
  { language_id: 'ar', name: 'Arabic', native_name: 'العربية', accent_support: true },
  { language_id: 'zh', name: 'Chinese', native_name: '中文', accent_support: true },
  { language_id: 'ja', name: 'Japanese', native_name: '日本語', accent_support: false },
  { language_id: 'hi', name: 'Hindi', native_name: 'हिन्दी', accent_support: true },
  { language_id: 'ko', name: 'Korean', native_name: '한국어', accent_support: false },
  { language_id: 'ur', name: 'Urdu', native_name: 'اردو', accent_support: true },
  { language_id: 'bn', name: 'Bengali', native_name: 'বাংলা', accent_support: false },
  { language_id: 'ta', name: 'Tamil', native_name: 'தமிழ்', accent_support: false },
  { language_id: 'te', name: 'Telugu', native_name: 'తెలుగు', accent_support: false },
  { language_id: 'mr', name: 'Marathi', native_name: 'मराठी', accent_support: false },
  { language_id: 'gu', name: 'Gujarati', native_name: 'ગુજરાતી', accent_support: false },
  { language_id: 'kn', name: 'Kannada', native_name: 'ಕನ್ನಡ', accent_support: false },
  { language_id: 'ml', name: 'Malayalam', native_name: 'മലയാളം', accent_support: false },
  { language_id: 'pa', name: 'Punjabi', native_name: 'ਪੰਜਾਬੀ', accent_support: false },
  { language_id: 'or', name: 'Odia', native_name: 'ଓଡ଼ିଆ', accent_support: false },
  { language_id: 'as', name: 'Assamese', native_name: 'অসমীয়া', accent_support: false },
  { language_id: 'ne', name: 'Nepali', native_name: 'नेपाली', accent_support: false },
  { language_id: 'si', name: 'Sinhala', native_name: 'සිංහල', accent_support: false },
  { language_id: 'my', name: 'Myanmar', native_name: 'မြန်မာ', accent_support: false },
  { language_id: 'km', name: 'Khmer', native_name: 'ខ្មែរ', accent_support: false },
  { language_id: 'lo', name: 'Lao', native_name: 'ລາວ', accent_support: false },
  { language_id: 'ka', name: 'Georgian', native_name: 'ქართული', accent_support: false },
];

class ElevenLabsService {
  private client: any;
  private maxRetries: number;
  private timeout: number;

  constructor(config: ElevenLabsConfig) {
    this.client = new (ElevenLabs as any)({
      apiKey: config.apiKey,
    });
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
  }

  async getVoices(): Promise<VoicesListResponse> {
    try {
      console.log('[ElevenLabs] Fetching available voices');
      
      const response = await this.client.voices.getAll();
      
      // Transform SDK response to our interface
      const voices: Voice[] = response.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        samples: voice.samples,
        category: voice.category,
        labels: voice.labels || {},
        description: voice.description,
        preview_url: voice.preview_url,
        available_for_tiers: voice.available_for_tiers || [],
        settings: voice.settings,
        high_quality_base_model_ids: voice.high_quality_base_model_ids || [],
        safety_control: voice.safety_control,
      }));

      return {
        voices,
        has_more: false, // SDK doesn't provide pagination info
      };
    } catch (error) {
      console.error('[ElevenLabs] Failed to fetch voices:', error);
      throw new Error(`Failed to fetch voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVoice(voiceId: string): Promise<Voice> {
    try {
      console.log(`[ElevenLabs] Fetching voice details for: ${voiceId}`);
      
      const voice = await this.client.voices.get(voiceId);
      
      return {
        voice_id: voice.voice_id,
        name: voice.name,
        samples: voice.samples,
        category: voice.category,
        labels: voice.labels || {},
        description: voice.description,
        preview_url: voice.preview_url,
        available_for_tiers: voice.available_for_tiers || [],
        settings: voice.settings,
        high_quality_base_model_ids: voice.high_quality_base_model_ids || [],
        safety_control: voice.safety_control,
      };
    } catch (error) {
      console.error('[ElevenLabs] Failed to fetch voice details:', error);
      throw new Error(`Failed to fetch voice details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSpeech(request: TextToSpeechRequest): Promise<AudioGenerationResponse> {
    try {
      console.log(`[ElevenLabs] Generating speech for voice: ${request.voice_id}`);
      
      const audioGenerator = await this.client.textToSpeech.convert({
        voice_id: request.voice_id,
        text: request.text,
        model_id: request.model_id || 'eleven_multilingual_v2',
        voice_settings: request.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
        output_format: request.output_format as any || 'mp3_44100_128',
      });

      // Convert async generator to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audioGenerator) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);

      const filename = `speech_${Date.now()}.mp3`;

      return {
        audio_data: audioBuffer,
        content_type: 'audio/mpeg',
        filename,
        duration_ms: this.estimateAudioDuration(request.text),
      };
    } catch (error) {
      console.error('[ElevenLabs] Speech generation failed:', error);
      throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSpeechStream(request: TextToSpeechRequest): Promise<AsyncGenerator<Buffer, void, unknown>> {
    try {
      console.log(`[ElevenLabs] Generating speech stream for voice: ${request.voice_id}`);
      
      return this.client.textToSpeech.convert({
        voice_id: request.voice_id,
        text: request.text,
        model_id: request.model_id || 'eleven_multilingual_v2',
        voice_settings: request.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
        output_format: request.output_format as any || 'mp3_44100_128',
      });
    } catch (error) {
      console.error('[ElevenLabs] Speech stream generation failed:', error);
      throw new Error(`Speech stream generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveAudioToFile(audioData: Buffer, filePath: string): Promise<string> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, audioData);
      console.log(`[ElevenLabs] Audio saved to: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error('[ElevenLabs] Failed to save audio file:', error);
      throw new Error(`Failed to save audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getSuggestedVoice(language: string, gender: 'male' | 'female' = 'female', style: 'professional' | 'casual' | 'energetic' | 'warm' = 'professional'): string {
    const languageVoices = VOICE_PRESETS[language as keyof typeof VOICE_PRESETS];
    
    if (!languageVoices) {
      // Fallback to English if language not supported
      return VOICE_PRESETS.english.female.professional;
    }

    const genderVoices = languageVoices[gender];
    if (!genderVoices) {
      // Fallback to opposite gender if not available
      const fallbackGender = gender === 'male' ? 'female' : 'male';
      return (languageVoices[fallbackGender] as any)?.[style] || (languageVoices[fallbackGender] as any)?.professional || VOICE_PRESETS.english.female.professional;
    }

    return (genderVoices as any)[style] || (genderVoices as any).professional || Object.values(genderVoices)[0];
  }

  getOptimalVoiceSettings(language: string, speed: 'slow' | 'normal' | 'fast' = 'normal'): any {
    const baseSettings: any = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    };

    // Adjust settings based on language characteristics
    switch (language) {
      case 'ur':
      case 'ar':
      case 'hi':
        // For tonal/complex languages, increase stability
        baseSettings.stability = 0.7;
        baseSettings.similarity_boost = 0.9;
        break;
      case 'zh':
      case 'ja':
        // For tonal languages, use higher stability and style
        baseSettings.stability = 0.8;
        baseSettings.style = 0.2;
        break;
      default:
        break;
    }

    // Adjust for speed
    switch (speed) {
      case 'slow':
        baseSettings.stability = Math.min(baseSettings.stability + 0.1, 1.0);
        break;
      case 'fast':
        baseSettings.stability = Math.max(baseSettings.stability - 0.1, 0.0);
        baseSettings.style = Math.min((baseSettings.style || 0) + 0.1, 1.0);
        break;
    }

    return baseSettings;
  }

  isLanguageSupported(languageCode: string): boolean {
    return SUPPORTED_LANGUAGES.some(lang => lang.language_id === languageCode);
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  private estimateAudioDuration(text: string): number {
    // Rough estimation: average speaking rate is ~150 words per minute
    const words = text.split(' ').length;
    const wordsPerMinute = 150;
    const minutes = words / wordsPerMinute;
    return Math.round(minutes * 60 * 1000); // Convert to milliseconds
  }

  async getVoiceSettings(voiceId: string): Promise<any> {
    try {
      console.log(`[ElevenLabs] Fetching voice settings for: ${voiceId}`);
      
      const settings = await this.client.voices.getSettings(voiceId);
      return settings;
    } catch (error) {
      console.error('[ElevenLabs] Failed to fetch voice settings:', error);
      throw new Error(`Failed to fetch voice settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateVoiceSettings(voiceId: string, settings: any): Promise<any> {
    try {
      console.log(`[ElevenLabs] Updating voice settings for: ${voiceId}`);
      
      const updatedSettings = await this.client.voices.editSettings(voiceId, settings);
      return updatedSettings;
    } catch (error) {
      console.error('[ElevenLabs] Failed to update voice settings:', error);
      throw new Error(`Failed to update voice settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadToS3(audioBuffer: Buffer, key: string): Promise<string> {
    try {
      // This should integrate with your S3 service
      // For now, return a mock URL
      const mockUrl = `https://your-bucket.s3.amazonaws.com/${key}`;
      console.log(`[ElevenLabs] Mock upload to S3: ${mockUrl}`);
      return mockUrl;
    } catch (error) {
      console.error('[ElevenLabs] Failed to upload to S3:', error);
      throw new Error(`Failed to upload to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getVoices();
      return true;
    } catch (error) {
      console.error('[ElevenLabs] Connection test failed:', error);
      return false;
    }
  }

  // New method for generating speech for individual messages
  async generateMessageSpeech(messageText: string, voiceId: string, messageId: string): Promise<AudioGenerationResponse> {
    try {
      console.log(`[ElevenLabs] Generating speech for message ${messageId} with voice: ${voiceId}`);
      
      const request: TextToSpeechRequest = {
        text: messageText,
        voice_id: voiceId,
        voice_settings: this.getOptimalVoiceSettings('en'), // Default to English, can be made dynamic
        model_id: 'eleven_multilingual_v2',
      };

      const response = await this.generateSpeech(request);
      
      // Update filename to include message ID
      response.filename = `message_${messageId}_${Date.now()}.mp3`;
      
      return response;
    } catch (error) {
      console.error(`[ElevenLabs] Failed to generate speech for message ${messageId}:`, error);
      throw new Error(`Failed to generate speech for message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch generate speech for multiple messages
  async generateBatchSpeech(messages: Array<{ id: string; text: string; voiceId: string }>): Promise<Array<{ messageId: string; audioResponse: AudioGenerationResponse }>> {
    const results: Array<{ messageId: string; audioResponse: AudioGenerationResponse }> = [];
    
    for (const message of messages) {
      try {
        const audioResponse = await this.generateMessageSpeech(message.text, message.voiceId, message.id);
        results.push({
          messageId: message.id,
          audioResponse,
        });
      } catch (error) {
        console.error(`[ElevenLabs] Failed to generate speech for message ${message.id}:`, error);
        // Continue with other messages even if one fails
      }
    }
    
    return results;
  }
}

// Singleton instance
let elevenLabsInstance: ElevenLabsService | null = null;

export const createElevenLabsService = (config: ElevenLabsConfig): ElevenLabsService => {
  if (!elevenLabsInstance) {
    elevenLabsInstance = new ElevenLabsService(config);
  }
  return elevenLabsInstance;
};

export const getElevenLabsService = (): ElevenLabsService => {
  if (!elevenLabsInstance) {
    throw new Error('ElevenLabs service not initialized. Call createElevenLabsService first.');
  }
  return elevenLabsInstance;
};

export default ElevenLabsService;