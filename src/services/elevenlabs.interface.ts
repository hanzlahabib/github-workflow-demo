import { VoicesListResponse, Voice, TextToSpeechRequest, AudioGenerationResponse, SupportedLanguage } from '../types/services';

export interface IElevenLabsService {
  getVoices(): Promise<VoicesListResponse>;
  getVoice(voiceId: string): Promise<Voice>;
  generateSpeech(request: TextToSpeechRequest): Promise<AudioGenerationResponse>;
  generateSpeechStream(request: TextToSpeechRequest): AsyncGenerator<Buffer, void, unknown>;
  saveAudioToFile(audioData: Buffer, filePath: string): Promise<string>;
  getSuggestedVoice(language: string, gender?: 'male' | 'female', style?: 'professional' | 'casual' | 'energetic' | 'warm'): string;
  getOptimalVoiceSettings(language: string, speed?: 'slow' | 'normal' | 'fast'): any;
  isLanguageSupported(languageCode: string): boolean;
  getSupportedLanguages(): SupportedLanguage[];
  getVoiceSettings(voiceId: string): Promise<any>;
  updateVoiceSettings(voiceId: string, settings: any): Promise<any>;
  uploadToS3(audioBuffer: Buffer, key: string): Promise<string>;
  uploadAudioToS3(audioBuffer: Buffer, type: 'voiceover' | 'message' | 'preview', userId: string, metadata?: any): Promise<{ url: string; key: string; expiresAt?: Date }>;
  testConnection(): Promise<boolean>;
  generateMessageSpeech(messageText: string, voiceId: string, messageId: string): Promise<AudioGenerationResponse>;
  generateBatchSpeech(messages: Array<{ id: string; text: string; voiceId: string }>): Promise<Array<{ messageId: string; audioResponse: AudioGenerationResponse }>>;
}
