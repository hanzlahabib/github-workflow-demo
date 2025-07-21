import { ElevenLabsConfig, VoicesListResponse, Voice, TextToSpeechRequest, AudioGenerationResponse, SupportedLanguage } from '../types/services';
import { BaseService } from './BaseService';
import { IElevenLabsService } from './elevenlabs.interface';

class MockElevenLabsService extends BaseService implements IElevenLabsService {
  private client: any;
  private test: any;

  constructor(config: ElevenLabsConfig) {
    super({
      name: 'MockElevenLabs',
      version: '1.0.0',
      ...config
    });
    this.client = {};
    this.test = {};
  }

  protected validateConfig(config: ElevenLabsConfig): void {
    // No validation needed for mock service
  }

  async getVoices(): Promise<VoicesListResponse> {
    return {
      voices: [],
      has_more: false,
    };
  }

  async getVoice(voiceId: string): Promise<Voice> {
    return {
      voice_id: voiceId,
      name: 'Mock Voice',
      samples: [],
      category: 'mock',
      labels: {},
      description: 'This is a mock voice.',
      preview_url: '',
      available_for_tiers: [],
      settings: null,
      high_quality_base_model_ids: [],
      safety_control: null,
    };
  }

  async generateSpeech(request: TextToSpeechRequest): Promise<AudioGenerationResponse> {
    return {
      audio_data: Buffer.from(''),
      content_type: 'audio/mpeg',
      filename: 'mock_speech.mp3',
      duration_ms: 1000,
    };
  }

  async *generateSpeechStream(request: TextToSpeechRequest): AsyncGenerator<Buffer, void, unknown> {
    yield Buffer.from('');
  }

  async saveAudioToFile(audioData: Buffer, filePath: string): Promise<string> {
    return filePath;
  }

  getSuggestedVoice(language: string, gender: 'male' | 'female' = 'female', style: 'professional' | 'casual' | 'energetic' | 'warm' = 'professional'): string {
    return 'mock_voice_id';
  }

  getOptimalVoiceSettings(language: string, speed: 'slow' | 'normal' | 'fast' = 'normal'): any {
    return {};
  }

  isLanguageSupported(languageCode: string): boolean {
    return true;
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return [];
  }

  private estimateAudioDuration(text: string): number {
    return 1000;
  }

  async getVoiceSettings(voiceId: string): Promise<any> {
    return {};
  }

  async updateVoiceSettings(voiceId: string, settings: any): Promise<any> {
    return {};
  }

  async uploadToS3(audioBuffer: Buffer, key: string): Promise<string> {
    return `https://mock-s3.com/${key}`;
  }

  async uploadAudioToS3(
    audioBuffer: Buffer,
    type: 'voiceover' | 'message' | 'preview',
    userId: string,
    metadata?: any
  ): Promise<{ url: string; key: string; expiresAt?: Date }> {
    return {
      url: `https://mock-s3-url.com/${type}/${userId}/audio.mp3`,
      key: `audio/${type}/${userId}/mock_audio.mp3`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async generateMessageSpeech(messageText: string, voiceId: string, messageId: string): Promise<AudioGenerationResponse> {
    return {
      audio_data: Buffer.from(''),
      content_type: 'audio/mpeg',
      filename: `mock_message_${messageId}.mp3`,
      duration_ms: 1000,
    };
  }

  async generateBatchSpeech(messages: Array<{ id: string; text: string; voiceId: string }>): Promise<Array<{ messageId: string; audioResponse: AudioGenerationResponse }>> {
    return [];
  }
}

export default MockElevenLabsService;
