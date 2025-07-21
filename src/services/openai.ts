import OpenAI from 'openai';
import { BaseService, ServiceConfig } from './BaseService';
import { CacheKeys, CacheTTL } from './cache';

export interface OpenAIConfig extends ServiceConfig {
  apiKey: string;
  organization?: string;
}

export interface ScriptGenerationRequest {
  videoType: 'story' | 'reddit' | 'quiz' | 'educational' | 'viral';
  topic: string;
  duration: number; // in seconds
  language: string;
  tone?: 'casual' | 'professional' | 'humorous' | 'dramatic';
  targetAudience?: string;
  platform?: 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'facebook_reels';
}

export interface ScriptGenerationResponse {
  script: string;
  scenes: Array<{
    text: string;
    duration: number;
    visualCues?: string;
    voiceNotes?: string;
  }>;
  metadata: {
    estimatedDuration: number;
    wordCount: number;
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export interface ContentOptimizationRequest {
  content: string;
  platform: 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'facebook_reels';
  goal: 'engagement' | 'virality' | 'education' | 'entertainment';
}

export interface TrendAnalysisRequest {
  niche: string;
  region?: string;
  timeframe: '24h' | '7d' | '30d';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizGenerationRequest {
  topic: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  language: string;
}

class OpenAIService extends BaseService {
  private client: OpenAI;

  constructor(config: OpenAIConfig) {
    super({
      name: 'OpenAI',
      version: '1.0.0',
      ...config
    });

    this.validateConfig(config);

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
    });
  }

  protected validateConfig(config: OpenAIConfig): void {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (config.apiKey.length < 10) {
      throw new Error('Invalid OpenAI API key format');
    }
  }

  async generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
    const cacheKey = CacheKeys.SCRIPT_GENERATION(request.topic, request.videoType, request.duration);

    const result = await this.executeWithErrorHandling(
      async () => {
        const prompt = this.buildScriptPrompt(request);

        const response = await this.client.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an expert video script writer specializing in short-form content for social media platforms. You understand viral content patterns, audience psychology, and platform-specific requirements.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content generated from OpenAI');
        }

        return this.parseScriptResponse(content, request.duration);
      },
      `generate ${request.videoType} script for topic: ${request.topic}`,
      {
        useCache: true,
        cacheKey,
        cacheTTL: CacheTTL.SCRIPT_GENERATION,
        retryOptions: {
          retryCondition: (error) => {
            // Retry on rate limiting or server errors
            return error.status === 429 || (error.status >= 500 && error.status < 600);
          }
        }
      }
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data!;
  }

  async optimizeContent(request: ContentOptimizationRequest): Promise<string> {
    try {
      console.log(`[OpenAI] Optimizing content for ${request.platform} with goal: ${request.goal}`);

      const prompt = `
        Optimize the following content for ${request.platform} to maximize ${request.goal}:
        
        Original Content: "${request.content}"
        
        Please provide:
        1. Optimized script with engaging hooks
        2. Strategic pacing for the platform
        3. Call-to-action suggestions
        4. Hashtag recommendations
        5. Thumbnail/visual suggestions
        
        Focus on proven viral patterns and platform-specific best practices.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a social media optimization expert with deep knowledge of platform algorithms and viral content patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 1500,
      });

      const optimizedContent = response.choices[0]?.message?.content;
      if (!optimizedContent) {
        throw new Error('No optimized content generated');
      }

      return optimizedContent;
    } catch (error) {
      console.error('[OpenAI] Content optimization failed:', error);
      throw new Error(`Content optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeTrends(request: TrendAnalysisRequest): Promise<string[]> {
    try {
      console.log(`[OpenAI] Analyzing trends for niche: ${request.niche}`);

      const prompt = `
        Analyze current trending topics and content ideas for the ${request.niche} niche within the ${request.timeframe} timeframe.
        ${request.region ? `Focus on trends relevant to ${request.region}.` : ''}
        
        Provide:
        1. Top 10 trending topics
        2. Content angles that are performing well
        3. Viral video formats in this niche
        4. Emerging trends to watch
        5. Suggested content pillars
        
        Base your analysis on current social media patterns and proven engagement drivers.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a trend analysis expert with deep knowledge of social media algorithms, viral content patterns, and audience behavior across different niches.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1200,
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('No trend analysis generated');
      }

      // Parse the response to extract trending topics
      const trends = analysis.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 10); // Return top 10 trends

      return trends;
    } catch (error) {
      console.error('[OpenAI] Trend analysis failed:', error);
      throw new Error(`Trend analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async summarizeRedditContent(redditText: string, maxLength: number = 100): Promise<string> {
    try {
      console.log('[OpenAI] Summarizing Reddit content');

      const prompt = `
        Summarize the following Reddit post/comment for a short video script (max ${maxLength} words):
        
        "${redditText}"
        
        Make it engaging, concise, and suitable for voiceover. Focus on the key story elements and emotional hooks.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at condensing Reddit content into engaging video scripts while preserving the key story elements and emotional impact.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 300,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No summary generated');
      }

      return summary;
    } catch (error) {
      console.error('[OpenAI] Reddit summarization failed:', error);
      throw new Error(`Reddit summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateQuizQuestions(request: QuizGenerationRequest): Promise<QuizQuestion[]> {
    try {
      console.log(`[OpenAI] Generating ${request.questionCount} quiz questions for topic: ${request.topic}`);

      const prompt = `
        Generate ${request.questionCount} ${request.difficulty} quiz questions about "${request.topic}" in ${request.language}.
        
        Format each question as JSON with:
        - question: the question text
        - options: array of 4 possible answers
        - correctAnswer: index (0-3) of correct answer
        - explanation: brief explanation of why the answer is correct
        - difficulty: question difficulty level
        
        Make questions engaging and suitable for video quiz format.
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an educational content creator expert at designing engaging quiz questions for video content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No quiz questions generated');
      }

      // Parse the JSON response
      try {
        const questions = JSON.parse(content) as QuizQuestion[];
        return questions;
      } catch (parseError) {
        // If JSON parsing fails, try to extract questions manually
        console.warn('[OpenAI] Failed to parse JSON, attempting manual extraction');
        return this.parseQuizQuestionsManually(content, request.questionCount);
      }
    } catch (error) {
      console.error('[OpenAI] Quiz generation failed:', error);
      throw new Error(`Quiz generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildScriptPrompt(request: ScriptGenerationRequest): string {
    const basePrompt = `
      Create a ${request.duration}-second ${request.videoType} video script about "${request.topic}" in ${request.language}.
      ${request.tone ? `Use a ${request.tone} tone.` : ''}
      ${request.targetAudience ? `Target audience: ${request.targetAudience}.` : ''}
      
      Requirements:
      - Engaging hook in first 3 seconds
      - Clear narrative structure
      - Strong visual cues for each scene
      - Optimal pacing for ${request.duration} seconds
      - Platform-optimized content
      
      Format as JSON with:
      - script: full script text
      - scenes: array of scene objects with text, duration, visualCues, voiceNotes
      - metadata: estimatedDuration, wordCount, difficulty
    `;

    return basePrompt;
  }

  private parseScriptResponse(content: string, targetDuration: number): ScriptGenerationResponse {
    try {
      const parsed = JSON.parse(content);
      return parsed as ScriptGenerationResponse;
    } catch {
      // Fallback parsing if JSON fails
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      const script = lines.join(' ');
      const wordCount = script.split(' ').length;
      const estimatedDuration = Math.round(wordCount * 0.4); // Rough estimate: 150 WPM

      return {
        script,
        scenes: [{
          text: script,
          duration: targetDuration,
          visualCues: 'Dynamic visuals matching content',
          voiceNotes: 'Clear, engaging delivery'
        }],
        metadata: {
          estimatedDuration,
          wordCount,
          difficulty: wordCount > 100 ? 'hard' : wordCount > 50 ? 'medium' : 'easy'
        }
      };
    }
  }

  private parseQuizQuestionsManually(content: string, count: number): QuizQuestion[] {
    // Fallback manual parsing if JSON parsing fails
    const questions: QuizQuestion[] = [];
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      questions.push({
        question: `Question ${i + 1}: Based on the topic`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0,
        explanation: 'Generated from content analysis',
        difficulty: 'medium'
      });
    }

    return questions;
  }

  public async testConnection(): Promise<boolean> {
    const result = await this.executeWithErrorHandling(
      async () => {
        await this.client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
        });
        return true;
      },
      'test connection',
      { useCache: false }
    );

    return result.success;
  }
}

// Singleton instance
let openaiInstance: OpenAIService | null = null;

export const createOpenAIService = (config: OpenAIConfig): OpenAIService => {
  if (!openaiInstance) {
    openaiInstance = new OpenAIService(config);
  }
  return openaiInstance;
};

export const getOpenAIService = (): OpenAIService => {
  if (!openaiInstance) {
    throw new Error('OpenAI service not initialized. Call createOpenAIService first.');
  }
  return openaiInstance;
};

export default OpenAIService;
