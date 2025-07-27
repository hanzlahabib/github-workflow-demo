# cURL Examples - ReelSpeed Backend API

Complete collection of cURL commands for testing all ReelSpeed API endpoints.

## 🔧 Setup

### Base URL
```bash
export BASE_URL="http://localhost:3000"
```

### Authentication Token
```bash
# Set after login (replace with actual token)
export TOKEN="your_jwt_access_token_here"
```

---

## 🔐 Authentication

### Register New User
```bash
curl -X POST ${BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login User
```bash
curl -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Refresh Token
```bash
curl -X POST ${BASE_URL}/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token"
  }'
```

### Get User Profile
```bash
curl -X GET ${BASE_URL}/api/auth/me \
  -H "Authorization: Bearer ${TOKEN}"
```

### Update User Profile
```bash
curl -X PATCH ${BASE_URL}/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "firstName": "Updated John",
    "lastName": "Updated Doe",
    "preferences": {
      "theme": "dark",
      "language": "en"
    }
  }'
```

---

## 🎙️ Voice Generation

### List All Voices
```bash
curl -X GET ${BASE_URL}/api/voices/list \
  -H "Authorization: Bearer ${TOKEN}"
```

### Get Voice Details
```bash
curl -X GET ${BASE_URL}/api/voices/pNInz6obpgDQGcFmaJgB \
  -H "Authorization: Bearer ${TOKEN}"
```

### Generate Voice Preview
```bash
curl -X POST ${BASE_URL}/api/voices/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "voiceId": "pNInz6obpgDQGcFmaJgB",
    "text": "Hello! This is a preview of this voice."
  }' \
  --output voice_preview.mp3
```

### Generate Message Speech
```bash
curl -X POST ${BASE_URL}/api/voices/generate-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "messageId": "msg_123",
    "text": "Hello there! How are you doing today? This is a longer message to test speech generation.",
    "voiceId": "pNInz6obpgDQGcFmaJgB",
    "language": "en",
    "speed": "normal"
  }'
```

### Generate Batch Speech
```bash
curl -X POST ${BASE_URL}/api/voices/generate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
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
        "voiceId": "pNInz6obpgDQGcFmaJgB"
      }
    ],
    "language": "en",
    "speed": "normal"
  }'
```

### Generate Voiceover Audio
```bash
curl -X POST ${BASE_URL}/api/voices/generate-voiceover-audio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "script": "Welcome to our amazing product demonstration. Today we will show you how AI can revolutionize your content creation process.",
    "selectedVoiceId": "pNInz6obpgDQGcFmaJgB",
    "stability": 0.5,
    "similarity": 0.8
  }'
```

### Generate Legacy Voice
```bash
curl -X POST ${BASE_URL}/api/voices/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "voiceId": "pNInz6obpgDQGcFmaJgB",
    "text": "This is a legacy voice generation example.",
    "personId": "person_123",
    "language": "en",
    "speed": "normal"
  }'
```

### Get Supported Languages
```bash
curl -X GET ${BASE_URL}/api/voices/languages/supported \
  -H "Authorization: Bearer ${TOKEN}"
```

### Get Voice Suggestion
```bash
curl -X GET ${BASE_URL}/api/voices/suggest/en/male/professional \
  -H "Authorization: Bearer ${TOKEN}"
```

### Get Voice History
```bash
curl -X GET "${BASE_URL}/api/voices/history?page=1&limit=20" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Get Voice Settings
```bash
curl -X GET ${BASE_URL}/api/voices/pNInz6obpgDQGcFmaJgB/settings \
  -H "Authorization: Bearer ${TOKEN}"
```

### Update Voice Settings
```bash
curl -X POST ${BASE_URL}/api/voices/pNInz6obpgDQGcFmaJgB/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "stability": 0.6,
    "similarity_boost": 0.9,
    "style": 0.1,
    "use_speaker_boost": true
  }'
```

### Test ElevenLabs Connection
```bash
curl -X GET ${BASE_URL}/api/voices/test/connection \
  -H "Authorization: Bearer ${TOKEN}"
```

### Get Cache Stats
```bash
curl -X GET ${BASE_URL}/api/voices/cache/stats \
  -H "Authorization: Bearer ${TOKEN}"
```

### Clear Voice Cache
```bash
curl -X DELETE ${BASE_URL}/api/voices/cache/clear \
  -H "Authorization: Bearer ${TOKEN}"
```

### Refresh Voice Cache
```bash
curl -X POST ${BASE_URL}/api/voices/cache/refresh \
  -H "Authorization: Bearer ${TOKEN}"
```

### Get Storage Stats
```bash
curl -X GET ${BASE_URL}/api/voices/storage/stats \
  -H "Authorization: Bearer ${TOKEN}"
```

### Manual Storage Cleanup
```bash
curl -X POST ${BASE_URL}/api/voices/storage/cleanup \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 📹 Video Generation

### Generate Video
```bash
curl -X POST ${BASE_URL}/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "story",
    "input": {
      "text": "This is an amazing story about AI and its impact on society",
      "script": "Welcome to our video about artificial intelligence. Today we will explore how AI is changing the world around us.",
      "title": "AI Revolution: The Future is Now",
      "config": {
        "messages": [],
        "people": [],
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
    "userId": "test_user_123"
  }'
```

### Check Video Status
```bash
# Replace VIDEO_ID with actual video ID from generation response
curl -X GET ${BASE_URL}/api/video/status/video_1705320600_abc123
```

### List Rendered Videos
```bash
curl -X GET ${BASE_URL}/api/video/renders
```

### Download Video
```bash
# Replace FILENAME with actual filename from renders list
curl -X GET ${BASE_URL}/api/video/download/sample_video.mp4 \
  --output downloaded_video.mp4
```

### Download Video with Range Request
```bash
curl -X GET ${BASE_URL}/api/video/download/sample_video.mp4 \
  -H "Range: bytes=0-1023" \
  --output video_chunk.mp4
```

---

## 📁 Asset Management

### List Background Videos
```bash
curl -X GET ${BASE_URL}/api/assets/videos/backgrounds
```

### List User Videos
```bash
# Replace USER_ID with actual user ID
curl -X GET ${BASE_URL}/api/assets/videos/user/user_123
```

### List Background Audio
```bash
curl -X GET ${BASE_URL}/api/assets/audio/backgrounds
```

### List User Audio
```bash
# Replace USER_ID with actual user ID
curl -X GET ${BASE_URL}/api/assets/audio/user/user_123
```

### List All User Assets
```bash
# Replace USER_ID with actual user ID
curl -X GET "${BASE_URL}/api/assets/list/user_123?type=all"
```

### List User Assets by Type
```bash
# Videos only
curl -X GET "${BASE_URL}/api/assets/list/user_123?type=video"

# Audio only
curl -X GET "${BASE_URL}/api/assets/list/user_123?type=audio"

# Images only
curl -X GET "${BASE_URL}/api/assets/list/user_123?type=image"
```

---

## 💬 Text Video Generation

### Analyze Conversation
```bash
curl -X POST ${BASE_URL}/api/textVideo/analyze-conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "messages": [
      {
        "text": "You won'\''t believe what happened to me today",
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
        "text": "😂😂😂 That'\''s hilarious! You got me there!",
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
  }'
```

### Generate Viral Script
```bash
curl -X POST ${BASE_URL}/api/textVideo/generate-viral-script \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
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
  }'
```

### Get Trending Templates
```bash
curl -X GET ${BASE_URL}/api/textVideo/trending-templates
```

### Generate Advanced Text Video
```bash
curl -X POST ${BASE_URL}/api/textVideo/generate-advanced \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "messages": [
      {
        "id": "1",
        "text": "I need to tell you something urgent",
        "sender": "left"
      },
      {
        "id": "2",
        "text": "What is it??",
        "sender": "right"
      },
      {
        "id": "3",
        "text": "I just won the lottery!",
        "sender": "left"
      }
    ],
    "people": [
      {
        "id": "person1",
        "name": "Lucky Person",
        "side": "left"
      },
      {
        "id": "person2",
        "name": "Best Friend",
        "side": "right"
      }
    ],
    "template": {
      "id": "viral-confession",
      "name": "Viral Confession"
    },
    "settings": {
      "textVideoSettings": {
        "chatOverlay": {
          "opacity": 100,
          "verticalPosition": 35,
          "scale": 2.2
        },
        "conversationStyle": {
          "typingIndicators": true,
          "messageAnimations": "slide",
          "bubbleStyle": "modern"
        },
        "aiEnhancements": {
          "enabled": true,
          "viralOptimization": true,
          "emotionalAnalysis": true
        }
      }
    },
    "advancedFeatures": {
      "crossPlatformTemplates": true,
      "cloudSync": true,
      "exportFormats": ["mp4", "gif"]
    }
  }'
```

---

## 🏆 Top 5 Videos

### Create Top 5 Project
```bash
curl -X POST ${BASE_URL}/api/top5/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Top 5 Most Viral TikTok Trends in 2024",
    "description": "Discover the hottest TikTok trends that are taking the internet by storm",
    "top5VideosData": {
      "category": "social media trends",
      "items": [
        {
          "rank": 1,
          "title": "AI Voice Cloning",
          "description": "Create realistic voice clones with AI",
          "popularity": 95
        },
        {
          "rank": 2,
          "title": "Viral Dance Challenges",
          "description": "New dance moves going viral daily",
          "popularity": 88
        },
        {
          "rank": 3,
          "title": "Text-to-Video AI",
          "description": "Generate videos from text prompts",
          "popularity": 82
        },
        {
          "rank": 4,
          "title": "Minimalist Aesthetics",
          "description": "Clean, simple visual styles",
          "popularity": 76
        },
        {
          "rank": 5,
          "title": "Educational Mini-Series",
          "description": "Quick learning content",
          "popularity": 71
        }
      ]
    },
    "settings": {
      "duration": 60,
      "style": "modern",
      "transitions": "smooth",
      "musicStyle": "upbeat"
    }
  }'
```

### Upload Video for Top 5
```bash
curl -X POST ${BASE_URL}/api/top5/upload-video \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "video=@path/to/your/video.mp4" \
  -F "rank=1" \
  -F "title=Amazing Video" \
  -F "description=This is an amazing video for our Top 5 list"
```

### Get Top 5 Health Status
```bash
curl -X GET ${BASE_URL}/api/top5/health \
  -H "Authorization: Bearer ${TOKEN}"
```

### Get Top 5 Statistics
```bash
curl -X GET ${BASE_URL}/api/top5/stats \
  -H "Authorization: Bearer ${TOKEN}"
```

### Complete Top 5 Workflow
```bash
curl -X POST ${BASE_URL}/api/top5/complete-workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "items": [
      {
        "rank": 1,
        "title": "AI Music Generation",
        "description": "Create songs with AI",
        "category": "technology"
      },
      {
        "rank": 2,
        "title": "VR Gaming",
        "description": "Immersive gaming experiences",
        "category": "gaming"
      }
    ],
    "configuration": {},
    "styling": {},
    "targetPlatforms": ["tiktok", "youtube"],
    "targetAudience": "tech enthusiasts"
  }'
```

### Get Trending Suggestions
```bash
curl -X GET "${BASE_URL}/api/top5/trending-suggestions/technology?platform=tiktok" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Market Analysis
```bash
curl -X POST ${BASE_URL}/api/top5/market-analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "topic": "AI tools for content creation",
    "category": "technology",
    "platforms": ["tiktok", "instagram", "youtube"]
  }'
```

### Get Trending Topics
```bash
curl -X GET "${BASE_URL}/api/top5/trending/topics?category=technology&platform=tiktok&timeframe=24h" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Analyze Viral Potential
```bash
curl -X POST ${BASE_URL}/api/top5/analysis/viral-potential \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "items": [
      {
        "rank": 1,
        "title": "AI-Generated Music",
        "description": "Create songs with artificial intelligence",
        "category": "technology",
        "keywords": ["AI", "music", "generation", "creative"]
      },
      {
        "rank": 2,
        "title": "Virtual Reality Gaming",
        "description": "Immersive gaming experiences",
        "category": "gaming",
        "keywords": ["VR", "gaming", "immersive", "future"]
      }
    ],
    "targetPlatforms": ["tiktok", "instagram", "youtube"],
    "targetAudience": "Gen Z and Millennials interested in technology"
  }'
```

---

## 📝 Captions

### List User Captions
```bash
curl -X GET "${BASE_URL}/api/captions?page=1&limit=10&status=completed&language=en" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Upload Video for Captions
```bash
curl -X POST ${BASE_URL}/api/captions/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "video=@path/to/your/video.mp4" \
  -F "title=My Video Caption Project" \
  -F "language=en" \
  -F 'settings={"timing": "auto", "autoSync": true, "speakerDetection": false}'
```

### Get Caption Details
```bash
# Replace CAPTION_ID with actual caption ID
curl -X GET ${BASE_URL}/api/captions/caption_123 \
  -H "Authorization: Bearer ${TOKEN}"
```

### Create Caption from Video
```bash
# Replace VIDEO_ID with actual video ID
curl -X POST ${BASE_URL}/api/captions/from-video/video_456 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Video Captions",
    "language": "en",
    "settings": {
      "timing": "auto",
      "autoSync": true,
      "speakerDetection": true
    }
  }'
```

### Update Caption
```bash
curl -X PUT ${BASE_URL}/api/captions/caption_123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Updated Caption Title",
    "language": "en",
    "lines": [
      {
        "id": "line-0",
        "start": 0.5,
        "end": 3.2,
        "text": "Welcome to our updated video",
        "confidence": 0.95
      }
    ]
  }'
```

### Delete Caption
```bash
curl -X DELETE ${BASE_URL}/api/captions/caption_123 \
  -H "Authorization: Bearer ${TOKEN}"
```

### Export Caption (SRT)
```bash
curl -X GET ${BASE_URL}/api/captions/caption_123/export/srt \
  -H "Authorization: Bearer ${TOKEN}" \
  --output captions.srt
```

### Export Caption (VTT)
```bash
curl -X GET ${BASE_URL}/api/captions/caption_123/export/vtt \
  -H "Authorization: Bearer ${TOKEN}" \
  --output captions.vtt
```

### Export Caption (JSON)
```bash
curl -X GET ${BASE_URL}/api/captions/caption_123/export/json \
  -H "Authorization: Bearer ${TOKEN}" \
  --output captions.json
```

### Apply Caption Template
```bash
curl -X POST ${BASE_URL}/api/captions/caption_123/apply-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "templateId": "tiktok-style",
    "templateName": "TikTok Style",
    "category": "tiktok"
  }'
```

### Get Caption Templates
```bash
curl -X GET ${BASE_URL}/api/captions/templates/list \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🔧 Avatar Management

### Upload Avatar
```bash
curl -X POST ${BASE_URL}/api/avatars/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "avatar=@path/to/your/avatar.jpg" \
  -F "name=My Profile Picture"
```

### Get Avatar Library
```bash
curl -X GET ${BASE_URL}/api/avatars/library \
  -H "Authorization: Bearer ${TOKEN}"
```

### Delete Avatar
```bash
# Replace AVATAR_ID with actual avatar ID
curl -X DELETE ${BASE_URL}/api/avatars/avatar_123 \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## ⚡ System Health

### Health Check
```bash
curl -X GET ${BASE_URL}/health
```

### API Information
```bash
curl -X GET ${BASE_URL}/
```

---

## 🛠️ Testing Scripts

### Complete Authentication Flow
```bash
#!/bin/bash

# Register user
echo "Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }')

echo "Register response: $REGISTER_RESPONSE"

# Login user
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.accessToken')
echo "Token: $TOKEN"

# Get profile
echo "Getting profile..."
curl -X GET ${BASE_URL}/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Voice Generation Test
```bash
#!/bin/bash

# Test voice list
echo "Testing voice list..."
curl -s -X GET ${BASE_URL}/api/voices/list | jq '.voices[0:3]'

# Test voice generation
echo "Testing voice generation..."
curl -s -X POST ${BASE_URL}/api/voices/generate-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messageId": "test_msg_123",
    "text": "This is a test message for voice generation.",
    "voiceId": "pNInz6obpgDQGcFmaJgB"
  }' | jq '.'
```

### Video Generation Test
```bash
#!/bin/bash

# Start video generation
echo "Starting video generation..."
VIDEO_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "story",
    "input": {
      "text": "Test video generation",
      "title": "Test Video"
    },
    "settings": {
      "duration": 15,
      "width": 720,
      "height": 1280
    }
  }')

echo "Video generation response: $VIDEO_RESPONSE"

# Extract video ID
VIDEO_ID=$(echo $VIDEO_RESPONSE | jq -r '.videoId')
echo "Video ID: $VIDEO_ID"

# Check status
echo "Checking video status..."
curl -s -X GET ${BASE_URL}/api/video/status/$VIDEO_ID | jq '.'
```

### Full API Health Check
```bash
#!/bin/bash

echo "=== ReelSpeed API Health Check ==="

# Basic health check
echo "1. Basic health check..."
curl -s -X GET ${BASE_URL}/health | jq '.'

# API info
echo "2. API information..."
curl -s -X GET ${BASE_URL}/ | jq '.'

# Voice connection test
echo "3. Voice service test..."
curl -s -X GET ${BASE_URL}/api/voices/test/connection | jq '.'

# Voice list test
echo "4. Voice list test..."
VOICE_COUNT=$(curl -s -X GET ${BASE_URL}/api/voices/list | jq '.voices | length')
echo "Available voices: $VOICE_COUNT"

# Asset test
echo "5. Asset test..."
curl -s -X GET ${BASE_URL}/api/assets/videos/backgrounds | jq '.success'

echo "=== Health check complete ==="
```

---

## 📚 Usage Tips

### Save Responses to Files
```bash
# Save voice list to file
curl -X GET ${BASE_URL}/api/voices/list > voices.json

# Save video status to file
curl -X GET ${BASE_URL}/api/video/status/VIDEO_ID > video_status.json
```

### Extract Data with jq
```bash
# Get just voice names
curl -s -X GET ${BASE_URL}/api/voices/list | jq '.voices[].name'

# Get video status
curl -s -X GET ${BASE_URL}/api/video/status/VIDEO_ID | jq '.status'

# Count available voices
curl -s -X GET ${BASE_URL}/api/voices/list | jq '.voices | length'
```

### Error Handling
```bash
# Check response status
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET ${BASE_URL}/api/voices/list)
HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BODY=$(echo $RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ $HTTP_STATUS -eq 200 ]; then
    echo "Success: $BODY"
else
    echo "Error $HTTP_STATUS: $BODY"
fi
```

### Timing Requests
```bash
# Measure request time
time curl -X GET ${BASE_URL}/api/voices/list > /dev/null

# Get detailed timing
curl -w "@curl-format.txt" -X GET ${BASE_URL}/api/voices/list > /dev/null

# Create curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect:    %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:       %{time_total}\n
```

---

## 🔧 Environment Variables for Scripts

Create a `.env` file for your testing scripts:

```bash
# .env
BASE_URL="http://localhost:3000"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="SecurePass123!"
TEST_VOICE_ID="pNInz6obpgDQGcFmaJgB"
TEST_USER_ID="test_user_123"
```

Load in your scripts:
```bash
#!/bin/bash
set -a
source .env
set +a

# Now use $BASE_URL, $TEST_EMAIL, etc.
```

---

*Complete cURL examples for ReelSpeed Backend API v1.0.0*

Ready to test the API? Start with the health check and authentication flow, then explore the specific features you need!