# ReelSpeed AI Services

This directory contains AI service integrations for the ReelSpeed video generation platform. Each service provides specific functionality for creating and processing video content.

## Services Overview

### 1. OpenAI Service (`openai.ts`)
- **Purpose**: GPT-4 integration for content generation
- **Features**:
  - Script generation for different video types
  - Content optimization for virality
  - Trend analysis and suggestions
  - Text summarization for Reddit videos
  - Quiz questions generation

### 2. ElevenLabs Service (`elevenlabs.ts`)
- **Purpose**: Advanced voice generation with multilingual support
- **Features**:
  - 32+ language support including Urdu, Arabic, Hindi
  - Multiple voice options (male, female, various accents)
  - Custom voice settings (speed, pitch, style)
  - Audio file management and streaming

### 3. Whisper Service (`whisper.ts`)
- **Purpose**: AI-powered caption and transcription generation
- **Features**:
  - 102 language transcription support
  - WebVTT and SRT format output
  - Word-level timestamp synchronization
  - High accuracy transcription

### 4. DALL-E Service (`dalle.ts`)
- **Purpose**: AI image generation for video content
- **Features**:
  - Story video backgrounds
  - Custom thumbnails
  - Visual elements for videos
  - Scene illustrations

### 5. S3 Service (`s3.ts`)
- **Purpose**: AWS S3 integration for file storage
- **Features**:
  - Video file storage with optimized naming
  - Asset management (audio, images, fonts)
  - Signed URL generation
  - File upload/download handling

### 6. Remotion Service (`remotion.ts`)
- **Purpose**: Video rendering with React-based templates
- **Features**:
  - Template-based rendering
  - Multiple video formats and aspect ratios
  - Custom compositions
  - Progress tracking and error handling

## Installation

First, install the required dependencies:

```bash
npm install openai aws-sdk node-fetch
npm install --save-dev @types/node-fetch
```

For Remotion support, you'll also need:

```bash
npm install @remotion/cli @remotion/renderer
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORGANIZATION=your_organization_id

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=reelspeed-assets

# Remotion Configuration
REMOTION_COMPOSITIONS_PATH=./remotion/compositions
REMOTION_OUTPUT_DIR=./renders
REMOTION_LAMBDA_REGION=us-east-1
REMOTION_LAMBDA_ROLE=arn:aws:iam::account:role/lambda-role
```

## Quick Start

### Initialize All Services

```typescript
import { initializeAIServices, testAllServices } from './services';

// Initialize all services
const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    organization: process.env.OPENAI_ORGANIZATION,
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY!,
  },
  whisper: {
    apiKey: process.env.OPENAI_API_KEY!, // Same as OpenAI
  },
  dalle: {
    apiKey: process.env.OPENAI_API_KEY!, // Same as OpenAI
  },
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION!,
    bucketName: process.env.S3_BUCKET_NAME!,
  },
  remotion: {
    compositionsPath: process.env.REMOTION_COMPOSITIONS_PATH!,
    outputDir: process.env.REMOTION_OUTPUT_DIR!,
    lambdaRegion: process.env.REMOTION_LAMBDA_REGION,
    lambdaRole: process.env.REMOTION_LAMBDA_ROLE,
  },
};

initializeAIServices(config);

// Test connectivity
const serviceStatus = await testAllServices();
console.log('Service Status:', serviceStatus);
```

## Usage Examples

### Generate Video Script

```typescript
import { getOpenAIService } from './services/openai';

const openai = getOpenAIService();

const script = await openai.generateScript({
  videoType: 'story',
  topic: 'The rise of artificial intelligence',
  duration: 60,
  language: 'en',
  tone: 'professional',
  targetAudience: 'tech enthusiasts',
});

console.log('Generated script:', script.script);
console.log('Scenes:', script.scenes);
```

### Generate Voice-Over

```typescript
import { getElevenLabsService } from './services/elevenlabs';

const elevenlabs = getElevenLabsService();

// Get suggested voice for language and style
const voiceId = elevenlabs.getSuggestedVoice('en', 'female', 'professional');
const voiceSettings = elevenlabs.getOptimalVoiceSettings('en');

const audio = await elevenlabs.generateSpeech({
  text: 'Hello, welcome to our amazing video!',
  voice_id: voiceId,
  voice_settings: voiceSettings,
});

// Save audio file
const audioPath = './output/voiceover.mp3';
await elevenlabs.saveAudioToFile(audio.audio_data, audioPath);
```

### Generate Captions

```typescript
import { getWhisperService } from './services/whisper';

const whisper = getWhisperService();

// Generate WebVTT captions
const captions = await whisper.generateWebVTT('./audio/speech.mp3', {
  maxLineLength: 40,
  maxLinesPerCaption: 2,
  wordLevelSync: true,
});

// Save captions
await whisper.saveCaptionsToFile(captions, './output/captions.vtt', 'vtt');
```

### Generate Video Background

```typescript
import { getDalleService } from './services/dalle';

const dalle = getDalleService();

const background = await dalle.generateVideoBackground({
  theme: 'nature',
  mood: 'calm',
  style: 'cinematic',
  aspectRatio: '9:16',
  description: 'Beautiful forest with morning sunlight',
});

if (background.url) {
  // Download the image
  const imagePath = './assets/background.jpg';
  await dalle.downloadImage(background.url, imagePath);
}
```

### Upload Assets to S3

```typescript
import { getS3Service } from './services/s3';

const s3 = getS3Service();

// Upload video file
const videoResult = await s3.uploadFile('./renders/video.mp4', {
  key: s3.generateVideoKey('user123', 'video456'),
  contentType: 'video/mp4',
  acl: 'private',
});

// Generate signed URL for download
const downloadUrl = await s3.getSignedUrl(videoResult.key, 'getObject', {
  expires: 3600, // 1 hour
});
```

### Render Video with Remotion

```typescript
import { getRemotionService } from './services/remotion';

const remotion = getRemotionService();

// Render story video
const storyProps = {
  script: 'Once upon a time...',
  scenes: [
    {
      text: 'Chapter 1: The Beginning',
      duration: 3,
      background: '#000000',
      animation: 'fadeIn',
    },
  ],
  style: {
    fontSize: 48,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    alignment: 'center',
  },
};

const result = await remotion.renderStoryVideo(storyProps, {
  width: 1080,
  height: 1920,
  fps: 30,
  quality: 90,
});

if (result.success) {
  console.log('Video rendered:', result.outputPath);
  console.log('Duration:', result.durationInSeconds, 'seconds');
  console.log('File size:', result.sizeInBytes, 'bytes');
}
```

## Workflow Examples

### Complete Video Generation Workflow

```typescript
import { AIWorkflowUtils } from './services';

async function createCompleteVideo(topic: string, userId: string) {
  try {
    // 1. Generate script
    const script = await AIWorkflowUtils.generateVideoScript(
      topic,
      'story',
      60,
      'en'
    );

    // 2. Generate voice-over
    const audio = await AIWorkflowUtils.generateVoiceOver(
      script.script,
      'en',
      'female',
      'professional'
    );

    // 3. Upload audio to S3
    const audioUpload = await AIWorkflowUtils.uploadAsset(
      './temp/audio.mp3',
      userId,
      'audio'
    );

    // 4. Generate background image
    const background = await AIWorkflowUtils.generateVideoBackground(
      'nature',
      'calm',
      '9:16'
    );

    // 5. Generate captions
    const captions = await AIWorkflowUtils.generateCaptions(
      './temp/audio.mp3'
    );

    // 6. Render final video
    const videoProps = {
      script: script.script,
      scenes: script.scenes,
      audioUrl: audioUpload.url,
      backgroundUrl: background.url,
      captions,
    };

    const finalVideo = await AIWorkflowUtils.renderCompleteVideo(
      'story-minimal',
      videoProps,
      userId,
      'video123'
    );

    return finalVideo;
  } catch (error) {
    console.error('Video generation failed:', error);
    throw error;
  }
}
```

## Error Handling

All services include comprehensive error handling with:

- Automatic retries with exponential backoff
- Detailed error logging
- Graceful fallbacks where possible
- Connection testing utilities

```typescript
import { testAllServices } from './services';

// Check service health
const serviceHealth = await testAllServices();
if (!serviceHealth.openai) {
  console.error('OpenAI service is unavailable');
}
```

## Rate Limiting

Each service implements rate limiting considerations:

- **OpenAI**: Respects API rate limits with retry logic
- **ElevenLabs**: Manages character quotas and concurrent requests
- **Whisper**: Handles file size limits and processing timeouts
- **DALL-E**: Manages image generation quotas
- **S3**: Implements efficient multipart uploads for large files
- **Remotion**: Controls concurrent render processes

## Security Notes

- All API keys should be stored in environment variables
- S3 uploads use private ACL by default
- Signed URLs have configurable expiration times
- File paths are validated to prevent directory traversal
- Input sanitization is implemented for all text inputs

## Performance Optimization

- Services use singleton patterns to avoid recreation
- Streaming is supported where available (ElevenLabs, S3)
- Concurrent processing is configurable
- Caching strategies are implemented for frequently accessed data
- Progress callbacks provide real-time updates for long operations

## Language Support

The services support a wide range of languages:

- **OpenAI**: All major languages
- **ElevenLabs**: 32+ languages including Urdu, Arabic, Hindi
- **Whisper**: 102 languages for transcription
- **DALL-E**: Text prompts in multiple languages

For optimal results with non-English content, use the appropriate language codes and voice settings provided by each service.