import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

export interface WhisperConfig {
  apiKey: string;
  organization?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface TranscriptionRequest {
  audioFile: string | Buffer | File;
  language?: string;
  model?: 'whisper-1';
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestamp_granularities?: ('word' | 'segment')[];
}

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionResponse {
  text: string;
  segments?: TranscriptionSegment[];
  words?: TranscriptionWord[];
  language?: string;
  duration?: number;
}

export interface CaptionOptions {
  maxLineLength?: number;
  maxLinesPerCaption?: number;
  minDuration?: number;
  maxDuration?: number;
  wordLevelSync?: boolean;
}

export interface Caption {
  start: number;
  end: number;
  text: string;
  words?: TranscriptionWord[];
}

// Supported languages for Whisper (102 languages)
export const WHISPER_LANGUAGES = {
  'af': 'Afrikaans',
  'am': 'Amharic',
  'ar': 'Arabic',
  'as': 'Assamese',
  'az': 'Azerbaijani',
  'ba': 'Bashkir',
  'be': 'Belarusian',
  'bg': 'Bulgarian',
  'bn': 'Bengali',
  'bo': 'Tibetan',
  'br': 'Breton',
  'bs': 'Bosnian',
  'ca': 'Catalan',
  'cs': 'Czech',
  'cy': 'Welsh',
  'da': 'Danish',
  'de': 'German',
  'el': 'Greek',
  'en': 'English',
  'es': 'Spanish',
  'et': 'Estonian',
  'eu': 'Basque',
  'fa': 'Persian',
  'fi': 'Finnish',
  'fo': 'Faroese',
  'fr': 'French',
  'gl': 'Galician',
  'gu': 'Gujarati',
  'ha': 'Hausa',
  'haw': 'Hawaiian',
  'he': 'Hebrew',
  'hi': 'Hindi',
  'hr': 'Croatian',
  'ht': 'Haitian Creole',
  'hu': 'Hungarian',
  'hy': 'Armenian',
  'id': 'Indonesian',
  'is': 'Icelandic',
  'it': 'Italian',
  'ja': 'Japanese',
  'jw': 'Javanese',
  'ka': 'Georgian',
  'kk': 'Kazakh',
  'km': 'Khmer',
  'kn': 'Kannada',
  'ko': 'Korean',
  'la': 'Latin',
  'lb': 'Luxembourgish',
  'ln': 'Lingala',
  'lo': 'Lao',
  'lt': 'Lithuanian',
  'lv': 'Latvian',
  'mg': 'Malagasy',
  'mi': 'Maori',
  'mk': 'Macedonian',
  'ml': 'Malayalam',
  'mn': 'Mongolian',
  'mr': 'Marathi',
  'ms': 'Malay',
  'mt': 'Maltese',
  'my': 'Myanmar',
  'ne': 'Nepali',
  'nl': 'Dutch',
  'nn': 'Nynorsk',
  'no': 'Norwegian',
  'oc': 'Occitan',
  'pa': 'Punjabi',
  'pl': 'Polish',
  'ps': 'Pashto',
  'pt': 'Portuguese',
  'ro': 'Romanian',
  'ru': 'Russian',
  'sa': 'Sanskrit',
  'sd': 'Sindhi',
  'si': 'Sinhala',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'sn': 'Shona',
  'so': 'Somali',
  'sq': 'Albanian',
  'sr': 'Serbian',
  'su': 'Sundanese',
  'sv': 'Swedish',
  'sw': 'Swahili',
  'ta': 'Tamil',
  'te': 'Telugu',
  'tg': 'Tajik',
  'th': 'Thai',
  'tk': 'Turkmen',
  'tl': 'Tagalog',
  'tr': 'Turkish',
  'tt': 'Tatar',
  'uk': 'Ukrainian',
  'ur': 'Urdu',
  'uz': 'Uzbek',
  'vi': 'Vietnamese',
  'yi': 'Yiddish',
  'yo': 'Yoruba',
  'zh': 'Chinese'
};

class WhisperService {
  private client: OpenAI;
  private maxRetries: number;
  private timeout: number;

  constructor(config: WhisperConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 120000, // 2 minutes for audio processing
    });
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 120000;
  }

  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    try {
      console.log('[Whisper] Starting audio transcription');

      // Prepare the audio file
      let audioFile: File;
      if (typeof request.audioFile === 'string') {
        // File path
        if (!fs.existsSync(request.audioFile)) {
          throw new Error(`Audio file not found: ${request.audioFile}`);
        }
        const audioBuffer = fs.readFileSync(request.audioFile);
        const fileName = path.basename(request.audioFile);
        audioFile = new File([audioBuffer], fileName, { type: this.getAudioMimeType(fileName) });
      } else if (Buffer.isBuffer(request.audioFile)) {
        // Buffer
        audioFile = new File([request.audioFile], 'audio.mp3', { type: 'audio/mpeg' });
      } else {
        // Already a File object
        audioFile = request.audioFile as File;
      }

      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: request.model || 'whisper-1',
        language: request.language,
        response_format: request.response_format || 'verbose_json',
        temperature: request.temperature || 0,
        timestamp_granularities: request.timestamp_granularities,
      });

      console.log('[Whisper] Transcription completed successfully');

      if (typeof response === 'string') {
        return { text: response };
      }

      return {
        text: response.text,
        segments: (response as any).segments,
        words: (response as any).words,
        language: (response as any).language,
        duration: (response as any).duration,
      };
    } catch (error) {
      console.error('[Whisper] Transcription failed:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCaptions(
    audioFile: string | Buffer | File,
    options: CaptionOptions = {}
  ): Promise<Caption[]> {
    try {
      console.log('[Whisper] Generating captions');

      const defaultOptions: Required<CaptionOptions> = {
        maxLineLength: 40,
        maxLinesPerCaption: 2,
        minDuration: 1.0,
        maxDuration: 6.0,
        wordLevelSync: true,
        ...options,
      };

      // Get word-level transcription
      const transcription = await this.transcribeAudio({
        audioFile,
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment'],
      });

      if (!transcription.words || transcription.words.length === 0) {
        throw new Error('No word-level timestamps available');
      }

      const captions = this.createCaptionsFromWords(transcription.words, defaultOptions);

      console.log(`[Whisper] Generated ${captions.length} captions`);
      return captions;
    } catch (error) {
      console.error('[Whisper] Caption generation failed:', error);
      throw new Error(`Caption generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateWebVTT(
    audioFile: string | Buffer | File,
    options: CaptionOptions = {}
  ): Promise<string> {
    try {
      const captions = await this.generateCaptions(audioFile, options);
      return this.convertToWebVTT(captions);
    } catch (error) {
      console.error('[Whisper] WebVTT generation failed:', error);
      throw new Error(`WebVTT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSRT(
    audioFile: string | Buffer | File,
    options: CaptionOptions = {}
  ): Promise<string> {
    try {
      const captions = await this.generateCaptions(audioFile, options);
      return this.convertToSRT(captions);
    } catch (error) {
      console.error('[Whisper] SRT generation failed:', error);
      throw new Error(`SRT generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async detectLanguage(audioFile: string | Buffer | File): Promise<string> {
    try {
      console.log('[Whisper] Detecting audio language');

      const transcription = await this.transcribeAudio({
        audioFile,
        response_format: 'verbose_json',
      });

      const detectedLanguage = transcription.language || 'en';
      console.log(`[Whisper] Detected language: ${detectedLanguage}`);

      return detectedLanguage;
    } catch (error) {
      console.error('[Whisper] Language detection failed:', error);
      throw new Error(`Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveCaptionsToFile(
    captions: Caption[] | string,
    filePath: string,
    format: 'vtt' | 'srt' = 'vtt'
  ): Promise<string> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let content: string;
      if (typeof captions === 'string') {
        content = captions;
      } else {
        content = format === 'vtt' ? this.convertToWebVTT(captions) : this.convertToSRT(captions);
      }

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Whisper] Captions saved to: ${filePath}`);

      return filePath;
    } catch (error) {
      console.error('[Whisper] Failed to save captions:', error);
      throw new Error(`Failed to save captions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isLanguageSupported(languageCode: string): boolean {
    return languageCode in WHISPER_LANGUAGES;
  }

  getSupportedLanguages(): { [key: string]: string } {
    return WHISPER_LANGUAGES;
  }

  private createCaptionsFromWords(words: TranscriptionWord[], options: Required<CaptionOptions>): Caption[] {
    const captions: Caption[] = [];
    let currentCaption: Caption | null = null;
    let currentLine = '';
    let lineCount = 0;

    for (const word of words) {
      const wordWithSpace = `${word.word} `;

      // Check if adding this word would exceed line length
      if (currentLine.length + wordWithSpace.length > options.maxLineLength) {
        // Start a new line
        if (currentCaption) {
          currentCaption.text += '\n';
          lineCount++;

          // Check if we've reached max lines per caption
          if (lineCount >= options.maxLinesPerCaption) {
            // Finish current caption and start a new one
            currentCaption.end = word.start;
            captions.push(currentCaption);
            currentCaption = null;
            lineCount = 0;
          }
        }
        currentLine = '';
      }

      // Start new caption if needed
      if (!currentCaption) {
        currentCaption = {
          start: word.start,
          end: word.end,
          text: '',
          words: options.wordLevelSync ? [] : undefined,
        };
        lineCount = 0;
      }

      // Add word to current caption
      currentCaption.text += wordWithSpace;
      currentCaption.end = word.end;
      currentLine += wordWithSpace;

      if (options.wordLevelSync && currentCaption.words) {
        currentCaption.words.push(word);
      }

      // Check caption duration limits
      const duration = currentCaption.end - currentCaption.start;
      if (duration >= options.maxDuration) {
        captions.push(currentCaption);
        currentCaption = null;
        currentLine = '';
        lineCount = 0;
      }
    }

    // Add final caption if exists
    if (currentCaption) {
      const duration = currentCaption.end - currentCaption.start;
      if (duration >= options.minDuration) {
        captions.push(currentCaption);
      } else if (captions.length > 0) {
        // Merge with previous caption if too short
        const lastCaption = captions[captions.length - 1];
        lastCaption.text += ' ' + currentCaption.text;
        lastCaption.end = currentCaption.end;
        if (options.wordLevelSync && lastCaption.words && currentCaption.words) {
          lastCaption.words.push(...currentCaption.words);
        }
      }
    }

    // Clean up text (trim extra spaces and newlines)
    captions.forEach(caption => {
      caption.text = caption.text.trim().replace(/\s+/g, ' ');
    });

    return captions;
  }

  private convertToWebVTT(captions: Caption[]): string {
    let vtt = 'WEBVTT\n\n';

    captions.forEach((caption, index) => {
      const start = this.formatTimestamp(caption.start, true);
      const end = this.formatTimestamp(caption.end, true);

      vtt += `${index + 1}\n`;
      vtt += `${start} --> ${end}\n`;
      vtt += `${caption.text}\n\n`;
    });

    return vtt;
  }

  private convertToSRT(captions: Caption[]): string {
    let srt = '';

    captions.forEach((caption, index) => {
      const start = this.formatTimestamp(caption.start, false);
      const end = this.formatTimestamp(caption.end, false);

      srt += `${index + 1}\n`;
      srt += `${start} --> ${end}\n`;
      srt += `${caption.text}\n\n`;
    });

    return srt;
  }

  private formatTimestamp(seconds: number, useDecimal: boolean = true): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    if (useDecimal) {
      const msStr = ms.toString().padStart(3, '0');
      return `${hoursStr}:${minutesStr}:${secsStr}.${msStr}`;
    } else {
      const msStr = ms.toString().padStart(3, '0');
      return `${hoursStr}:${minutesStr}:${secsStr},${msStr}`;
    }
  }

  private getAudioMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm',
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }

  async testConnection(): Promise<boolean> {
    try {
      // Create a small test audio file (silence)
      const testBuffer = Buffer.alloc(1024); // Small buffer
      const testFile = new File([testBuffer], 'test.mp3', { type: 'audio/mpeg' });

      await this.client.audio.transcriptions.create({
        file: testFile,
        model: 'whisper-1',
      });

      return true;
    } catch (error) {
      console.error('[Whisper] Connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let whisperInstance: WhisperService | null = null;

export const createWhisperService = (config: WhisperConfig): WhisperService => {
  if (!whisperInstance) {
    whisperInstance = new WhisperService(config);
  }
  return whisperInstance;
};

export const getWhisperService = (): WhisperService => {
  if (!whisperInstance) {
    throw new Error('Whisper service not initialized. Call createWhisperService first.');
  }
  return whisperInstance;
};

export default WhisperService;
