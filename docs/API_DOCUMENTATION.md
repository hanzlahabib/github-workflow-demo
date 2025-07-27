# ReelSpeed Backend API Documentation

🎬 **Comprehensive API for AI-powered viral video generation platform**

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Voice Generation](#voice-generation)
  - [Video Generation](#video-generation)
  - [Asset Management](#asset-management)
  - [Text Video Generation](#text-video-generation)
  - [Top 5 Videos](#top-5-videos)
  - [Captions](#captions)
  - [Avatar Management](#avatar-management)
  - [System Health](#system-health)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDKs and Tools](#sdks-and-tools)

## Overview

The ReelSpeed Backend API powers a comprehensive AI-driven video generation platform with the following key features:

### 🚀 Core Features
- **🎙️ ElevenLabs Voice Generation** - High-quality AI voice synthesis
- **📹 Video Processing** - Advanced video generation with Remotion
- **🔒 JWT Authentication** - Secure user authentication and authorization
- **📱 Multi-platform Optimization** - Content optimized for TikTok, Instagram, YouTube
- **🗄️ S3/R2 Asset Management** - Scalable file storage and delivery
- **📊 Analytics & Performance** - Viral potential analysis and optimization
- **💬 Text Video Creation** - AI-powered conversation-based videos
- **🏆 Top 5 Content** - Trending topic analysis and list creation
- **📝 Auto-Captions** - Whisper AI-powered caption generation

### 🏗️ Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: MongoDB with Mongoose ODM
- **Storage**: AWS S3 / Cloudflare R2 compatibility
- **Cache**: Redis with intelligent fallback
- **Queue**: BullMQ for background processing
- **AI Services**: OpenAI, ElevenLabs, Whisper integration

### 🌐 Base URLs
- **Development**: `http://localhost:3000`
- **Production**: `https://api.reelspeed.ai`

## Quick Start

### 1. Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login to get tokens
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 2. Generate Voice
```bash
# Get available voices
curl -X GET http://localhost:3000/api/voices/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate speech
curl -X POST http://localhost:3000/api/voices/generate-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messageId": "msg_123",
    "text": "Hello! This is AI-generated speech.",
    "voiceId": "pNInz6obpgDQGcFmaJgB"
  }'
```

### 3. Create Video
```bash
# Start video generation
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "story",
    "input": {
      "text": "Amazing AI story",
      "title": "AI Revolution"
    },
    "settings": {
      "duration": 30,
      "width": 1080,
      "height": 1920
    }
  }'
```

### 4. Check System Health
```bash
curl -X GET http://localhost:3000/health
```

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication with access and refresh token patterns.

### Authentication Flow
1. **Register** or **Login** to receive tokens
2. **Include access token** in `Authorization: Bearer <token>` header
3. **Refresh tokens** when they expire using refresh endpoint

### Token Lifecycle
- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 7 days
- **Auto-refresh**: Use refresh endpoint to get new access tokens

### Security Features
- Password hashing with bcrypt
- Email validation and normalization  
- Rate limiting on auth endpoints
- Secure token generation with proper expiration

---

## API Reference

## Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "plan": "free",
    "points": 100,
    "badges": [],
    "videosCreated": 0
  },
  "tokens": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": 3600
  },
  "requestId": "req_123"
}
```

**Validation Rules:**
- Email must be valid format
- Password minimum 8 characters with letters, numbers, and symbols
- First and last names required and trimmed
- Email must be unique

### POST /api/auth/login

Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "plan": "free",
    "points": 95,
    "badges": ["early_adopter"],
    "videosCreated": 5,
    "lastLogin": "2024-01-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": 3600
  },
  "requestId": "req_124"
}
```

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):**
```json
{
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token",
  "expiresIn": 3600
}
```

### GET /api/auth/me

Get current user profile information.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://cdn.reelspeed.ai/avatars/user_avatar.jpg",
    "plan": "pro",
    "points": 250,
    "badges": ["early_adopter", "content_creator"],
    "videosCreated": 25,
    "preferences": {
      "theme": "dark",
      "language": "en",
      "notifications": true
    },
    "subscription": {
      "status": "active",
      "plan": "pro",
      "expiresAt": "2024-02-15T00:00:00Z"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### PATCH /api/auth/profile

Update user profile information.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "firstName": "Updated John",
  "lastName": "Updated Doe",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "Updated John",
    "lastName": "Updated Doe",
    "avatar": "https://cdn.reelspeed.ai/avatars/user_avatar.jpg",
    "plan": "pro",
    "points": 250,
    "badges": ["early_adopter", "content_creator"],
    "videosCreated": 25,
    "preferences": {
      "theme": "dark",
      "language": "en",
      "notifications": false
    }
  }
}
```

---

## Voice Generation

Powered by ElevenLabs AI for high-quality speech synthesis.

### GET /api/voices/list

Get all available voices for speech generation.

**Headers (Optional):**
```
Authorization: Bearer jwt_access_token
```

**Response (200):**
```json
{
  "voices": [
    {
      "voice_id": "pNInz6obpgDQGcFmaJgB",
      "name": "Adam",
      "category": "premade",
      "labels": {
        "accent": "american",
        "age": "young",
        "gender": "male",
        "language": "english",
        "use_case": "general"
      },
      "description": "A young American male voice",
      "preview_url": "https://storage.googleapis.com/eleven-public-prod/previews/adam.mp3",
      "available_for_tiers": ["free", "starter", "creator", "pro"],
      "settings": {
        "stability": 0.5,
        "similarity_boost": 0.8,
        "style": 0.0,
        "use_speaker_boost": true
      }
    }
  ],
  "total": 50,
  "hasMore": false
}
```

### GET /api/voices/{voiceId}

Get detailed information about a specific voice.

**Path Parameters:**
- `voiceId` (required): ElevenLabs voice ID

**Headers (Optional):**
```
Authorization: Bearer jwt_access_token
```

**Response (200):**
```json
{
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "name": "Adam",
  "category": "premade",
  "labels": {
    "accent": "american",
    "age": "young",
    "gender": "male",
    "language": "english",
    "use_case": "general"
  },
  "description": "A young American male voice perfect for casual content",
  "preview_url": "https://storage.googleapis.com/eleven-public-prod/previews/adam.mp3",
  "available_for_tiers": ["free", "starter", "creator", "pro"],
  "settings": {
    "stability": 0.5,
    "similarity_boost": 0.8,
    "style": 0.0,
    "use_speaker_boost": true
  },
  "fine_tuning": {
    "is_allowed_to_fine_tune": false
  },
  "high_quality_base_model_ids": ["eleven_multilingual_v2"]
}
```

### POST /api/voices/preview

Generate a short audio preview for a voice.

**Headers (Optional):**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "text": "Hello! This is a preview of this voice."
}
```

**Response (200):**
Returns audio/mpeg binary data with headers:
```
Content-Type: audio/mpeg
Content-Length: 15432
Cache-Control: public, max-age=3600
Content-Disposition: inline; filename="preview_adam.mp3"
```

### POST /api/voices/generate-message

Generate speech audio for a specific message.

**Headers (Optional):**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "messageId": "msg_123",
  "text": "Hello there! How are you doing today? This is a longer message to test speech generation.",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "language": "en",
  "speed": "normal",
  "customSettings": {
    "stability": 0.6,
    "similarity_boost": 0.9,
    "style": 0.1,
    "use_speaker_boost": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "messageId": "msg_123",
  "audioUrl": "https://cdn.reelspeed.ai/audio/messages/user_123/msg_123.mp3",
  "audioKey": "messages/user_123/msg_123.mp3",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "filename": "message_msg_123.mp3",
  "duration": 4500,
  "settings": {
    "stability": 0.6,
    "similarity_boost": 0.9,
    "style": 0.1,
    "use_speaker_boost": true
  },
  "expiresAt": "2024-01-22T10:30:00Z"
}
```

### POST /api/voices/generate-batch

Generate speech for multiple messages in batch.

**Headers (Optional):**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "messages": [
    {
      "id": "msg_1",
      "text": "Hello there!",
      "voiceId": "pNInz6obpgDQGcFmaJgB"
    },
    {
      "id": "msg_2", 
      "text": "How are you doing today?",
      "voiceId": "pNInz6obpgDQGcFmaJgB"
    },
    {
      "id": "msg_3",
      "text": "This is amazing!",
      "voiceId": "EXAVITQu4vr4xnSDxMaL"
    }
  ],
  "language": "en",
  "speed": "normal"
}
```

**Response (200):**
```json
{
  "success": true,
  "totalMessages": 3,
  "generatedCount": 3,
  "results": [
    {
      "messageId": "msg_1",
      "audioUrl": "https://cdn.reelspeed.ai/audio/messages/user_123/msg_1.mp3",
      "audioKey": "messages/user_123/msg_1.mp3",
      "filename": "message_msg_1.mp3",
      "duration": 1200,
      "expiresAt": "2024-01-22T10:30:00Z"
    },
    {
      "messageId": "msg_2",
      "audioUrl": "https://cdn.reelspeed.ai/audio/messages/user_123/msg_2.mp3",
      "audioKey": "messages/user_123/msg_2.mp3",
      "filename": "message_msg_2.mp3",
      "duration": 2100,
      "expiresAt": "2024-01-22T10:30:00Z"
    },
    {
      "messageId": "msg_3",
      "audioUrl": "https://cdn.reelspeed.ai/audio/messages/user_123/msg_3.mp3",
      "audioKey": "messages/user_123/msg_3.mp3", 
      "filename": "message_msg_3.mp3",
      "duration": 1800,
      "expiresAt": "2024-01-22T10:30:00Z"
    }
  ]
}
```

### POST /api/voices/generate-voiceover-audio

Generate voiceover audio for video content.

**Headers (Optional):**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "script": "Welcome to our amazing product demonstration. Today we'll show you how AI can revolutionize your content creation process and help you create viral videos effortlessly.",
  "selectedVoiceId": "pNInz6obpgDQGcFmaJgB",
  "stability": 0.5,
  "similarity": 0.8,
  "ownerId": "user_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "audio_url": "https://cdn.reelspeed.ai/audio/voiceovers/user_123/voiceover_456.mp3",
  "audioKey": "voiceovers/user_123/voiceover_456.mp3",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "filename": "voiceover_456.mp3",
  "duration": 12500,
  "settings": {
    "stability": 0.5,
    "similarity_boost": 0.8,
    "style": 0.0,
    "use_speaker_boost": true
  },
  "expiresAt": "2024-01-22T10:30:00Z",
  "environment": "production"
}
```

### GET /api/voices/test/connection

Test connectivity to ElevenLabs API service.

**Headers (Optional):**
```
Authorization: Bearer jwt_access_token
```

**Response (200):**
```json
{
  "connected": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "ElevenLabs"
}
```

---

## Video Generation

Create and manage AI-powered video content using Remotion.

### POST /api/video/generate

Start video generation process with specified configuration.

**Request Body:**
```json
{
  "type": "story",
  "input": {
    "text": "This is an amazing story about AI and its impact on society",
    "script": "Welcome to our video about artificial intelligence. Today we'll explore how AI is changing the world around us.",
    "title": "AI Revolution: The Future is Now",
    "config": {
      "messages": [
        {
          "id": "1",
          "text": "Did you know AI can now create videos?",
          "sender": "left"
        },
        {
          "id": "2", 
          "text": "Really? That's incredible!",
          "sender": "right"
        }
      ],
      "people": [
        {
          "id": "person1",
          "name": "Alex",
          "side": "left"
        },
        {
          "id": "person2",
          "name": "Sam", 
          "side": "right"
        }
      ],
      "settings": {
        "theme": "modern",
        "style": "professional"
      }
    }
  },
  "settings": {
    "duration": 30,
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "voice": "default",
    "background": "#000000", 
    "language": "en"
  },
  "userId": "user_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "videoId": "video_1705320600_abc123",
  "status": "processing",
  "message": "Video generation started"
}
```

### GET /api/video/status/{videoId}

Check the current status of video generation.

**Path Parameters:**
- `videoId` (required): Video ID from generation request

**Response (200):**
```json
{
  "success": true,
  "videoId": "video_1705320600_abc123",
  "status": "completed",
  "progress": 100,
  "message": "Video generation completed successfully!",
  "outputPath": "/api/video/download/video_1705320600_abc123.mp4",
  "sizeInBytes": 5242880,
  "duration": 30.5
}
```

**Status Values:**
- `processing`: Video is being generated
- `completed`: Video generation finished successfully  
- `failed`: Video generation failed with error

### GET /api/video/renders

Get list of all rendered video files.

**Response (200):**
```json
{
  "success": true,
  "renders": [
    {
      "filename": "story_video_123.mp4",
      "url": "/api/video/download/story_video_123.mp4",
      "created": "2024-01-15T10:30:00Z"
    },
    {
      "filename": "reddit_video_456.mp4", 
      "url": "/api/video/download/reddit_video_456.mp4",
      "created": "2024-01-15T09:15:00Z"
    }
  ]
}
```

### GET /api/video/download/{filename}

Download or stream a rendered video file with range support.

**Path Parameters:**
- `filename` (required): Video filename from renders list

**Headers (Optional):**
```
Range: bytes=0-1023
```

**Response (200/206):**
Returns video/mp4 binary data with headers:
```
Content-Type: video/mp4
Content-Length: 5242880
Accept-Ranges: bytes
Content-Range: bytes 0-1023/5242880  (for range requests)
```

---

## Asset Management

Manage video, audio, and image assets stored in S3/R2.

### GET /api/assets/videos/backgrounds

Get all available background videos from cloud storage.

**Response (200):**
```json
{
  "success": true,
  "videos": [
    {
      "id": "sunset_beach_001",
      "name": "Sunset Beach",
      "category": "background",
      "videoUrl": "https://cdn.reelspeed.ai/backgrounds/videos/sunset_beach_001.mp4",
      "size": 15728640,
      "duration": 15.5,
      "uploadedAt": "2024-01-10T08:00:00Z",
      "isPublic": true
    },
    {
      "id": "city_timelapse_002", 
      "name": "City Timelapse",
      "category": "background",
      "videoUrl": "https://cdn.reelspeed.ai/backgrounds/videos/city_timelapse_002.mp4",
      "size": 22369280,
      "duration": 20.0,
      "uploadedAt": "2024-01-10T08:00:00Z",
      "isPublic": true
    }
  ]
}
```

### GET /api/assets/videos/user/{userId}

Get user's uploaded videos from cloud storage.

**Path Parameters:**
- `userId` (required): User identifier

**Response (200):**
```json
{
  "success": true,
  "videos": [
    {
      "id": "custom_intro_123",
      "name": "My Custom Intro",
      "category": "custom",
      "videoUrl": "https://cdn.reelspeed.ai/users/user_123/videos/custom_intro_123.mp4",
      "size": 8388608,
      "duration": 10.0,
      "uploadedAt": "2024-01-14T15:30:00Z",
      "isPublic": false
    }
  ]
}
```

### GET /api/assets/audio/backgrounds

Get all available background audio tracks.

**Response (200):**
```json
{
  "success": true,
  "tracks": [
    {
      "id": "upbeat_electronic_001",
      "name": "Upbeat Electronic",
      "category": "background",
      "url": "https://cdn.reelspeed.ai/backgrounds/audio/upbeat_electronic_001.mp3",
      "size": 4194304,
      "duration": 180.0,
      "uploadedAt": "2024-01-10T08:00:00Z",
      "isPublic": true
    },
    {
      "id": "chill_ambient_002",
      "name": "Chill Ambient", 
      "category": "background",
      "url": "https://cdn.reelspeed.ai/backgrounds/audio/chill_ambient_002.mp3",
      "size": 3670016,
      "duration": 156.5,
      "uploadedAt": "2024-01-10T08:00:00Z",
      "isPublic": true
    }
  ]
}
```

### GET /api/assets/list/{userId}

Get all assets (video, audio, images) for a user with filtering.

**Path Parameters:**
- `userId` (required): User identifier

**Query Parameters:**
- `type` (optional): Filter by type - `video`, `audio`, `image`, `all` (default: `all`)

**Response (200):**
```json
{
  "success": true,
  "assets": [
    {
      "id": "custom_video_123",
      "name": "My Video",
      "type": "video",
      "url": "https://cdn.reelspeed.ai/users/user_123/videos/custom_video_123.mp4",
      "size": 8388608,
      "uploadedAt": "2024-01-14T15:30:00Z",
      "isPublic": false
    },
    {
      "id": "voiceover_456",
      "name": "Voiceover Track",
      "type": "audio", 
      "url": "https://cdn.reelspeed.ai/users/user_123/audio/voiceover_456.mp3",
      "size": 2097152,
      "uploadedAt": "2024-01-14T16:00:00Z",
      "isPublic": false
    },
    {
      "id": "thumbnail_789",
      "name": "Video Thumbnail",
      "type": "image",
      "url": "https://cdn.reelspeed.ai/users/user_123/images/thumbnail_789.jpg",
      "size": 524288,
      "uploadedAt": "2024-01-14T16:15:00Z", 
      "isPublic": false
    }
  ],
  "count": 3
}
```

---

## Text Video Generation

Create viral text-based videos with AI-powered conversation analysis.

### POST /api/textVideo/analyze-conversation

Analyze conversation messages for viral potential and optimization.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "messages": [
    {
      "text": "You won't believe what happened to me today",
      "sender": "left"
    },
    {
      "text": "What happened??",
      "sender": "right"
    },
    {
      "text": "I was walking to work and saw a celebrity!",
      "sender": "left"
    },
    {
      "text": "No way! Who was it?",
      "sender": "right"
    },
    {
      "text": "It was actually my neighbor dressed as Batman for Halloween 😂",
      "sender": "left"
    },
    {
      "text": "😂😂😂 That's hilarious! You got me there!",
      "sender": "right"
    }
  ],
  "people": [
    {
      "id": "person1",
      "name": "Alex",
      "side": "left"
    },
    {
      "id": "person2",
      "name": "Jordan", 
      "side": "right"
    }
  ],
  "targetDemographic": "young adults"
}
```

**Response (200):**
```json
{
  "success": true,
  "analysis": {
    "conversationMetadata": {
      "totalMessages": 6,
      "avgMessageLength": 42,
      "conversationFlow": "optimal",
      "emotionalArc": "1,0,1,0,2,1",
      "viralScore": 78,
      "engagementPrediction": 85,
      "targetDemographic": "young adults",
      "contentTags": ["comedy", "surprise", "friendship"],
      "difficultyLevel": "intermediate",
      "aiGenerated": false,
      "formatVersion": "2.0"
    },
    "suggestions": [
      {
        "type": "hook",
        "message": "Great opening hook that creates immediate intrigue",
        "example": "The opening 'You won't believe...' effectively grabs attention"
      },
      {
        "type": "pacing",
        "message": "Consider adding one more buildup message before the reveal",
        "example": "Add suspense with 'Wait until you hear this part...'"
      }
    ],
    "optimization": {
      "recommendedChanges": 1,
      "potentialViralIncrease": 15,
      "bestPerformingSegment": 5,
      "engagementHotspots": [
        {"message": 1, "score": 1},
        {"message": 3, "score": 1}, 
        {"message": 5, "score": 2},
        {"message": 6, "score": 1}
      ]
    }
  },
  "message": "Conversation analyzed successfully"
}
```

### POST /api/textVideo/generate-viral-script

Generate AI-powered viral conversation scripts for text videos.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "prompt": "A surprising discovery at the workplace that changes everything",
  "tone": "dramatic",
  "length": "medium",
  "scriptType": "story", 
  "targetDemographic": "working professionals",
  "people": [
    {
      "id": "person1",
      "name": "Sam",
      "side": "left",
      "avatar": "professional1"
    },
    {
      "id": "person2",
      "name": "Taylor",
      "side": "right",
      "avatar": "professional2"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "1",
        "text": "I need to tell someone this before I lose my mind",
        "sender": "left",
        "delay": 0,
        "emotions": ["excited", "urgent"],
        "reactions": []
      },
      {
        "id": "2",
        "text": "What happened??",
        "sender": "right",
        "delay": 2000,
        "emotions": ["engaged"],
        "reactions": []
      },
      {
        "id": "3",
        "text": "So basically, I found something in the office that nobody was supposed to see...",
        "sender": "left",
        "delay": 4000,
        "emotions": ["mysterious"],
        "reactions": []
      },
      {
        "id": "4",
        "text": "Wait, WHAT?!",
        "sender": "right",
        "delay": 6000,
        "emotions": ["shocked"],
        "reactions": []
      },
      {
        "id": "5",
        "text": "And then the most insane thing happened...",
        "sender": "left",
        "delay": 8000,
        "emotions": ["climax"],
        "reactions": []
      },
      {
        "id": "6",
        "text": "I'm on the edge of my seat!",
        "sender": "right",
        "delay": 10000,
        "emotions": ["engaged"],
        "reactions": []
      },
      {
        "id": "7",
        "text": "I still can't believe it really happened",
        "sender": "left",
        "delay": 12000,
        "emotions": ["resolved"],
        "reactions": []
      },
      {
        "id": "8",
        "text": "You need to make this into a movie!",
        "sender": "right",
        "delay": 14000,
        "emotions": ["amazed"],
        "reactions": []
      }
    ],
    "title": "Story Script",
    "people": [
      {
        "id": "person1",
        "name": "Sam",
        "side": "left",
        "avatar": "professional1"
      },
      {
        "id": "person2",
        "name": "Taylor",
        "side": "right", 
        "avatar": "professional2"
      }
    ],
    "conversationMetadata": {
      "totalMessages": 8,
      "avgMessageLength": 38,
      "conversationFlow": "optimal",
      "emotionalArc": "1,0,1,-1,2,1,0,1",
      "viralScore": 82,
      "engagementPrediction": 102,
      "targetDemographic": "working professionals",
      "contentTags": ["story", "dramatic", "medium"],
      "difficultyLevel": "intermediate",
      "aiGenerated": true,
      "aiPrompt": "A surprising discovery at the workplace that changes everything",
      "formatVersion": "2.0"
    },
    "template": {
      "pattern": "hook-build-reveal",
      "messages": 8,
      "viral_elements": ["immediate_hook", "suspense_building", "plot_twist"]
    },
    "viralElements": ["immediate_hook", "suspense_building", "plot_twist"]
  },
  "message": "Viral script generated successfully"
}
```

### GET /api/textVideo/trending-templates

Get trending templates for text video creation.

**Response (200):**
```json
{
  "success": true,
  "templates": [
    {
      "id": "viral-confession",
      "name": "Viral Confession",
      "description": "Perfect for shocking revelations and confessions",
      "category": "drama",
      "viralScore": 95,
      "tags": ["confession", "dramatic", "shocking"],
      "preview": {
        "messages": 8,
        "avgEngagement": "2.3M views",
        "platforms": ["TikTok", "Instagram", "YouTube Shorts"]
      }
    },
    {
      "id": "plot-twist-story",
      "name": "Plot Twist Story", 
      "description": "Build suspense with an unexpected twist",
      "category": "story",
      "viralScore": 88,
      "tags": ["suspense", "twist", "engaging"],
      "preview": {
        "messages": 12,
        "avgEngagement": "1.8M views",
        "platforms": ["TikTok", "Instagram", "YouTube Shorts"]
      }
    },
    {
      "id": "relationship-drama",
      "name": "Relationship Drama",
      "description": "Relationship conflicts that spark discussions",
      "category": "romance",
      "viralScore": 91,
      "tags": ["relationship", "drama", "emotional"],
      "preview": {
        "messages": 10,
        "avgEngagement": "2.1M views",
        "platforms": ["TikTok", "Instagram", "YouTube Shorts"]
      }
    }
  ],
  "message": "Trending templates retrieved successfully"
}
```

---

## Top 5 Videos

Create and optimize Top 5 list content with AI-powered trending analysis.

### POST /api/top5/create

Create a new Top 5 video project.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "title": "Top 5 Most Viral TikTok Trends in 2024",
  "description": "Discover the hottest TikTok trends that are taking the internet by storm",
  "top5VideosData": {
    "category": "social media trends",
    "items": [
      {
        "rank": 1,
        "title": "AI Voice Cloning",
        "description": "Create realistic voice clones with AI technology for content creation",
        "popularity": 95,
        "keywords": ["AI", "voice", "cloning", "technology"],
        "videoUrl": "https://example.com/ai-voice-demo.mp4",
        "thumbnailUrl": "https://example.com/ai-voice-thumb.jpg"
      },
      {
        "rank": 2,
        "title": "Viral Dance Challenges",
        "description": "New dance moves and challenges going viral daily",
        "popularity": 88,
        "keywords": ["dance", "viral", "challenge", "movement"],
        "videoUrl": "https://example.com/dance-demo.mp4",
        "thumbnailUrl": "https://example.com/dance-thumb.jpg"
      },
      {
        "rank": 3,
        "title": "Text-to-Video AI",
        "description": "Generate professional videos from simple text prompts", 
        "popularity": 82,
        "keywords": ["AI", "video", "generation", "automation"],
        "videoUrl": "https://example.com/text-video-demo.mp4",
        "thumbnailUrl": "https://example.com/text-video-thumb.jpg"
      },
      {
        "rank": 4,
        "title": "Minimalist Aesthetics",
        "description": "Clean, simple visual styles gaining popularity",
        "popularity": 76,
        "keywords": ["minimalist", "clean", "aesthetic", "simple"],
        "videoUrl": "https://example.com/minimal-demo.mp4",
        "thumbnailUrl": "https://example.com/minimal-thumb.jpg"
      },
      {
        "rank": 5,
        "title": "Educational Mini-Series",
        "description": "Quick learning content in bite-sized formats",
        "popularity": 71,
        "keywords": ["education", "learning", "quick", "series"],
        "videoUrl": "https://example.com/edu-demo.mp4",
        "thumbnailUrl": "https://example.com/edu-thumb.jpg"
      }
    ]
  },
  "settings": {
    "duration": 60,
    "style": "modern",
    "transitions": "smooth",
    "musicStyle": "upbeat",
    "targetPlatforms": ["tiktok", "instagram", "youtube"]
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "videoId": "top5_video_1705320600_def456",
    "status": "processing",
    "message": "Top 5 video creation started",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/top5/trending/topics

Get currently trending topics for Top 5 video creation.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Query Parameters:**
- `category` (optional): Filter by category
- `platform` (optional): Filter by platform - `tiktok`, `instagram`, `youtube`, `twitter`, `all` (default: `all`)
- `timeframe` (optional): Time range - `24h`, `7d`, `30d` (default: `24h`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "id": "ai_tools_2024",
        "title": "AI Tools Revolutionizing Content Creation",
        "category": "technology",
        "popularity": 94,
        "growth": 15.8,
        "platforms": ["tiktok", "instagram", "youtube"],
        "hashtags": ["#AItools", "#contentcreation", "#2024trends", "#automation"],
        "suggestedAngles": [
          "Top 5 AI tools every creator needs",
          "AI tools that will replace traditional methods",
          "Free vs Paid AI tools comparison"
        ]
      },
      {
        "id": "sustainable_living_tips",
        "title": "Sustainable Living Hacks",
        "category": "lifestyle",
        "popularity": 87,
        "growth": 12.3,
        "platforms": ["instagram", "tiktok", "youtube"],
        "hashtags": ["#sustainable", "#ecofriendly", "#zerowaste", "#greenliving"],
        "suggestedAngles": [
          "Top 5 sustainable swaps for beginners",
          "Eco-friendly alternatives that actually work",
          "Money-saving sustainable lifestyle tips"
        ]
      },
      {
        "id": "productivity_hacks_2024",
        "title": "Productivity Methods Taking Over",
        "category": "business",
        "popularity": 83,
        "growth": 18.7,
        "platforms": ["tiktok", "youtube", "twitter"],
        "hashtags": ["#productivity", "#timemanagement", "#lifehacks", "#efficiency"],
        "suggestedAngles": [
          "Top 5 productivity hacks that changed my life",
          "Time management techniques from successful people",
          "Productivity apps vs traditional methods"
        ]
      }
    ]
  }
}
```

### POST /api/top5/analysis/viral-potential

Analyze content items for viral potential using AI algorithms.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Request Body:**
```json
{
  "items": [
    {
      "rank": 1,
      "title": "AI-Generated Music",
      "description": "Create professional songs using artificial intelligence",
      "category": "technology",
      "keywords": ["AI", "music", "generation", "creative", "automation"]
    },
    {
      "rank": 2,
      "title": "Virtual Reality Gaming",
      "description": "Immersive gaming experiences in virtual worlds",
      "category": "gaming",
      "keywords": ["VR", "gaming", "immersive", "future", "technology"]
    },
    {
      "rank": 3,
      "title": "Sustainable Fashion",
      "description": "Eco-friendly clothing and fashion trends",
      "category": "lifestyle",
      "keywords": ["sustainable", "fashion", "eco", "green", "ethical"]
    }
  ],
  "targetPlatforms": ["tiktok", "instagram", "youtube"],
  "targetAudience": "Gen Z and Millennials interested in technology and lifestyle"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overallViralScore": 78,
    "platformScores": {
      "tiktok": 82,
      "instagram": 76,
      "youtube": 74
    },
    "strengths": [
      "Strong trending keywords alignment",
      "High engagement potential topics",
      "Good cross-platform appeal",
      "Relevant to target demographic"
    ],
    "weaknesses": [
      "Could benefit from more emotional hooks",
      "Missing visual appeal elements",
      "Limited controversy/debate potential"
    ],
    "recommendations": [
      {
        "type": "content",
        "priority": "high",
        "suggestion": "Add personal stories or testimonials for emotional connection",
        "expectedImpact": "+12% engagement"
      },
      {
        "type": "visual",
        "priority": "medium", 
        "suggestion": "Include surprising statistics or little-known facts",
        "expectedImpact": "+8% viral potential"
      },
      {
        "type": "timing",
        "priority": "medium",
        "suggestion": "Post during peak hours: 6-9 PM on weekdays",
        "expectedImpact": "+15% reach"
      }
    ],
    "competitorAnalysis": {
      "similarContent": 47,
      "avgPerformance": "1.2M views",
      "topPerformers": [
        "AI music creation secrets",
        "VR gaming setup guide", 
        "Sustainable fashion haul"
      ]
    },
    "marketGaps": [
      "AI music for beginners",
      "Budget VR gaming setups",
      "Affordable sustainable fashion"
    ]
  }
}
```

---

## Captions

Auto-generate and manage video captions using Whisper AI.

### GET /api/captions

Get all captions for authenticated user with filtering and pagination.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status - `processing`, `completed`, `failed`
- `language` (optional): Filter by language code
- `search` (optional): Search in title and caption text

**Response (200):**
```json
{
  "success": true,
  "data": {
    "captions": [
      {
        "_id": "caption_123",
        "userId": "user_123",
        "videoId": "video_456",
        "title": "My Awesome Video Captions",
        "language": "en",
        "status": "completed",
        "lines": [
          {
            "id": "line-0",
            "start": 0.5,
            "end": 3.2,
            "text": "Welcome to our amazing video",
            "confidence": 0.95,
            "speaker": "speaker_1"
          },
          {
            "id": "line-1",
            "start": 3.5,
            "end": 6.8,
            "text": "Today we'll show you something incredible",
            "confidence": 0.92,
            "speaker": "speaker_1"
          }
        ],
        "totalDuration": 30.5,
        "style": {
          "fontSize": 24,
          "fontFamily": "Arial",
          "fontColor": "#FFFFFF",
          "backgroundColor": "#000000",
          "backgroundOpacity": 70,
          "position": "bottom",
          "animation": "fade"
        },
        "settings": {
          "timing": "auto",
          "autoSync": true,
          "speakerDetection": false,
          "noiseReduction": true,
          "enhanceAudio": true,
          "confidenceThreshold": 0.7
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "analytics": {
          "viewCount": 15,
          "editCount": 3,
          "exportCount": 2,
          "lastAccessed": "2024-01-15T14:20:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### POST /api/captions/upload

Upload video file and generate captions using Whisper AI.

**Headers:**
```
Authorization: Bearer jwt_access_token
Content-Type: multipart/form-data
```

**Form Data:**
- `video` (required): Video file (max 500MB)
- `title` (optional): Caption project title
- `language` (optional): Language code (default: "en")
- `settings` (optional): JSON string with caption settings

**Response (201):**
```json
{
  "success": true,
  "data": {
    "caption": {
      "_id": "caption_789",
      "userId": "user_123",
      "title": "Uploaded Video Captions",
      "language": "en",
      "status": "processing",
      "source": {
        "type": "upload",
        "originalFilename": "my_video.mp4",
        "fileSize": 52428800,
        "videoFormat": "video/mp4"
      },
      "settings": {
        "timing": "auto",
        "autoSync": true,
        "speakerDetection": false,
        "noiseReduction": true,
        "enhanceAudio": true,
        "confidenceThreshold": 0.7
      },
      "lines": [],
      "totalDuration": 0,
      "createdAt": "2024-01-15T15:00:00Z"
    }
  }
}
```

### GET /api/captions/{id}

Get detailed information about a specific caption project.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Path Parameters:**
- `id` (required): Caption ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "caption": {
      "_id": "caption_123",
      "userId": "user_123",
      "videoId": "video_456",
      "title": "My Awesome Video Captions",
      "language": "en",
      "status": "completed",
      "lines": [
        {
          "id": "line-0",
          "start": 0.5,
          "end": 3.2,
          "text": "Welcome to our amazing video",
          "confidence": 0.95,
          "speaker": "speaker_1"
        },
        {
          "id": "line-1",
          "start": 3.5,
          "end": 6.8,
          "text": "Today we'll show you something incredible",
          "confidence": 0.92,
          "speaker": "speaker_1"
        }
      ],
      "totalDuration": 30.5,
      "processing": {
        "engineUsed": "whisper",
        "processingTime": 45000,
        "averageConfidence": 0.94,
        "qualityScore": 0.88,
        "wordsPerMinute": 120,
        "errorCount": 0,
        "warnings": []
      },
      "analytics": {
        "viewCount": 16,
        "editCount": 3,
        "exportCount": 2,
        "lastAccessed": "2024-01-15T15:30:00Z"
      }
    }
  }
}
```

### GET /api/captions/{id}/export/{format}

Export caption in various formats (SRT, VTT, JSON).

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Path Parameters:**
- `id` (required): Caption ID
- `format` (required): Export format - `srt`, `vtt`, `json`

**Response (200):**
Returns file download with appropriate headers:
```
Content-Disposition: attachment; filename="my_captions.srt"
Content-Type: application/x-subrip  (for SRT)
Content-Type: text/vtt  (for VTT)
Content-Type: application/json  (for JSON)
```

**SRT Format Example:**
```
1
00:00:00,500 --> 00:00:03,200
Welcome to our amazing video

2
00:00:03,500 --> 00:00:06,800
Today we'll show you something incredible
```

### GET /api/captions/templates/list

Get available caption style templates.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "youtube-style",
        "name": "YouTube Style",
        "category": "youtube",
        "preview": "/api/templates/youtube-preview.png",
        "style": {
          "fontSize": 24,
          "fontFamily": "Arial",
          "fontColor": "#FFFFFF",
          "backgroundColor": "#000000",
          "backgroundOpacity": 70,
          "position": "bottom",
          "animation": "none"
        }
      },
      {
        "id": "tiktok-style",
        "name": "TikTok Style",
        "category": "tiktok",
        "preview": "/api/templates/tiktok-preview.png",
        "style": {
          "fontSize": 28,
          "fontFamily": "Impact",
          "fontColor": "#FFFFFF",
          "backgroundColor": "#000000",
          "backgroundOpacity": 0,
          "position": "center",
          "animation": "pop"
        }
      }
    ]
  }
}
```

---

## Avatar Management

Upload and manage user avatar images with automatic processing.

### POST /api/avatars/upload

Upload and process new avatar image.

**Headers:**
```
Authorization: Bearer jwt_access_token
Content-Type: multipart/form-data
```

**Form Data:**
- `avatar` (required): Image file (max 5MB, JPG/PNG)
- `name` (required): Avatar name/description

**Response (200):**
```json
{
  "success": true,
  "avatar": {
    "id": "avatar_abc123",
    "name": "My Profile Picture",
    "url": "https://cdn.reelspeed.ai/avatars/user_123/avatar_abc123.jpg",
    "userId": "user_123",
    "createdAt": "2024-01-15T16:00:00Z",
    "isCustom": true
  }
}
```

### GET /api/avatars/library

Get user's custom avatar collection.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Response (200):**
```json
{
  "avatars": [
    {
      "id": "avatar_123",
      "name": "My Profile Picture",
      "url": "https://cdn.reelspeed.ai/avatars/user_123/avatar_123.jpg",
      "userId": "user_123",
      "createdAt": "2024-01-15T16:00:00Z",
      "isCustom": true
    },
    {
      "id": "avatar_456",
      "name": "Business Photo",
      "url": "https://cdn.reelspeed.ai/avatars/user_123/avatar_456.jpg", 
      "userId": "user_123",
      "createdAt": "2024-01-14T10:30:00Z",
      "isCustom": true
    }
  ]
}
```

### DELETE /api/avatars/{avatarId}

Delete a custom avatar.

**Headers:**
```
Authorization: Bearer jwt_access_token
```

**Path Parameters:**
- `avatarId` (required): Avatar ID to delete

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

---

## System Health

Monitor API health and get system information.

### GET /health

Check API health and service status.

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T16:30:00Z"
}
```

### GET /

Get API information and available services.

**Response (200):**
```json
{
  "message": "ReelSpeed Backend API",
  "services": {
    "voices": "/api/voices/list",
    "video": "/api/video/generate",
    "status": "/api/video/status/:videoId",
    "renders": "/api/video/renders"
  }
}
```

---

## Error Handling

The API uses standardized error responses with consistent structure.

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details (development only)",
  "requestId": "req_123456789"
}
```

### HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., email already exists)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: External service unavailable

### Common Error Codes
- `INVALID_EMAIL`: Email format is invalid
- `INVALID_PASSWORD`: Password doesn't meet requirements
- `USER_EXISTS`: User with email already exists
- `INVALID_CREDENTIALS`: Login credentials are incorrect
- `UNAUTHORIZED`: Valid authentication required
- `MISSING_FIELDS`: Required fields are missing
- `INVALID_INPUT`: Input data validation failed
- `SERVICE_UNAVAILABLE`: External service is unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests

### Example Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters with letters, numbers, and symbols",
  "code": "INVALID_PASSWORD",
  "requestId": "req_123456789"
}
```

**Authentication Error (401):**
```json
{
  "success": false,
  "error": "Invalid credentials provided",
  "code": "INVALID_CREDENTIALS",
  "requestId": "req_123456790"
}
```

**Service Unavailable (503):**
```json
{
  "success": false,
  "error": "ElevenLabs service is temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "requestId": "req_123456791"
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability.

### Rate Limits
- **Authentication endpoints**: 10 requests per minute per IP
- **Voice generation**: 100 requests per hour per user
- **Video generation**: 50 requests per hour per user
- **General API**: 1000 requests per hour per user

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705323600
```

### Rate Limit Exceeded Response (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 3600 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600,
  "requestId": "req_123456792"
}
```

---

## SDKs and Tools

### Available Resources
- **📄 OpenAPI Spec**: [openapi.yaml](./openapi.yaml)
- **🌐 Interactive Docs**: [api-docs.html](./api-docs.html)
- **📮 Postman Collection**: [ReelSpeed-API.postman_collection.json](./ReelSpeed-API.postman_collection.json)

### Postman Setup
1. Import the collection file
2. Set environment variables:
   - `base_url`: `http://localhost:3000`
   - `auth_token`: Will be auto-set after login
   - `refresh_token`: Will be auto-set after login

### cURL Examples Collection

#### Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","firstName":"John","lastName":"Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

#### Voice Generation
```bash
# List voices
curl -X GET http://localhost:3000/api/voices/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate speech
curl -X POST http://localhost:3000/api/voices/generate-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"messageId":"msg_123","text":"Hello world!","voiceId":"pNInz6obpgDQGcFmaJgB"}'
```

#### Video Generation
```bash
# Start video generation
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"story","input":{"text":"Amazing story","title":"AI Demo"},"settings":{"duration":30}}'

# Check status
curl -X GET http://localhost:3000/api/video/status/VIDEO_ID
```

### Development Tools
- **Health Check**: `GET /health`
- **API Info**: `GET /`
- **Voice Connection Test**: `GET /api/voices/test/connection`

---

## Support and Contact

- **Documentation**: [Interactive API Docs](./api-docs.html)
- **Issues**: Create GitHub issues for bugs and feature requests
- **API Status**: Monitor system health at `/health` endpoint

---

*Generated by ReelSpeed API Documentation System v1.0.0*