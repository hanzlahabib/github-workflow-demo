# ReelSpeed Backend API Documentation

Welcome to the comprehensive documentation for the ReelSpeed Backend API! This directory contains everything you need to understand, test, and integrate with our AI-powered viral video generation platform.

## 📚 Documentation Overview

### 🎯 Quick Start
- **New to the API?** Start with [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Want to test immediately?** Open [api-docs.html](./api-docs.html) in your browser
- **Using Postman?** Import [ReelSpeed-API.postman_collection.json](./ReelSpeed-API.postman_collection.json)
- **Building integrations?** Use [openapi.yaml](./openapi.yaml) for code generation

### 📋 Available Files

| File | Description | Use Case |
|------|-------------|----------|
| [📖 API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Complete API reference with examples | Learning the API, integration guide |
| [🌐 api-docs.html](./api-docs.html) | Interactive documentation with live testing | Real-time API testing, exploration |
| [📮 ReelSpeed-API.postman_collection.json](./ReelSpeed-API.postman_collection.json) | Postman collection for comprehensive testing | Team testing, API validation |
| [⚙️ openapi.yaml](./openapi.yaml) | OpenAPI 3.0 specification | Code generation, tooling integration |
| [📝 curl-examples.md](./curl-examples.md) | cURL command examples for all endpoints | Command-line testing, scripting |

## 🚀 Getting Started

### 1. Start the API Server
```bash
cd reelspeed-backend
npm run dev  # Development server on port 3000
```

### 2. Choose Your Documentation Format

#### 🌐 Interactive Documentation (Recommended)
```bash
# Open in your browser
open docs/api-docs.html
# or
python3 -m http.server 8080 --directory docs
open http://localhost:8080/api-docs.html
```

#### 📮 Postman Collection
1. Open Postman
2. Import `ReelSpeed-API.postman_collection.json`
3. Set environment variables:
   - `base_url`: `http://localhost:3000`
   - Tokens will be auto-set after authentication

#### 📖 Markdown Documentation
```bash
# View in your favorite markdown reader
cat docs/API_DOCUMENTATION.md
```

#### ⚙️ OpenAPI Specification
```bash
# Use with swagger-ui, redoc, or code generators
npx swagger-ui-serve docs/openapi.yaml
```

## 🎬 API Overview

The ReelSpeed Backend API provides comprehensive functionality for AI-powered video generation:

### 🔧 Core Features
- **🎙️ ElevenLabs Voice Generation** - High-quality AI voice synthesis
- **📹 Video Processing** - Advanced video generation with Remotion
- **🔒 JWT Authentication** - Secure user authentication and authorization
- **📱 Multi-platform Optimization** - Content optimized for TikTok, Instagram, YouTube
- **🗄️ S3/R2 Asset Management** - Scalable file storage and delivery
- **📊 Analytics & Performance** - Viral potential analysis and optimization

### 🛠️ Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: MongoDB with Mongoose ODM
- **Storage**: AWS S3 / Cloudflare R2 compatibility
- **Cache**: Redis with intelligent fallback
- **AI Services**: OpenAI, ElevenLabs, Whisper integration

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Quick Authentication Test
```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Voice Generation Test
```bash
# List available voices
curl -X GET http://localhost:3000/api/voices/list

# Generate speech (replace YOUR_TOKEN)
curl -X POST http://localhost:3000/api/voices/generate-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messageId": "test_123",
    "text": "Hello! This is a test of AI voice generation.",
    "voiceId": "pNInz6obpgDQGcFmaJgB"
  }'
```

### Video Generation Test
```bash
# Start video generation
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "story",
    "input": {
      "text": "This is an amazing AI-generated story",
      "title": "AI Demo Video"
    },
    "settings": {
      "duration": 30,
      "width": 1080,
      "height": 1920
    }
  }'
```

## 📊 API Endpoints Summary

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **🔐 Authentication** | 5 endpoints | User registration, login, profile management |
| **🎙️ Voice Generation** | 12 endpoints | ElevenLabs voice synthesis and management |
| **📹 Video Generation** | 4 endpoints | Video creation and status tracking |
| **📁 Asset Management** | 5 endpoints | S3/R2 file storage and retrieval |
| **💬 Text Videos** | 4 endpoints | Viral text-based video creation |
| **🏆 Top 5 Videos** | 8 endpoints | Trending content analysis and creation |
| **📝 Captions** | 7 endpoints | AI-powered caption generation |
| **🔧 Avatar Management** | 3 endpoints | User avatar upload and management |
| **⚡ System Health** | 2 endpoints | API health monitoring |

**Total: 50+ API endpoints** covering all aspects of viral video creation.

## 🔧 Environment Setup

### Required Environment Variables
```bash
# Copy and configure
cp .env.example .env

# Essential variables
ELEVENLABS_API_KEY=your_elevenlabs_api_key
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=mongodb://localhost:27017/reelspeed
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret

# Storage (AWS S3 or Cloudflare R2)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET=reelspeed-assets

# Or Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY=your_r2_access_key
CLOUDFLARE_R2_SECRET_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET=reelspeed-assets
CLOUDFLARE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
```

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔍 API Features Deep Dive

### 🎙️ Voice Generation Capabilities
- **50+ Premium Voices** from ElevenLabs
- **Multiple Languages** with native accent support
- **Batch Processing** for efficient generation
- **Custom Voice Settings** for fine-tuning
- **Audio Caching** with S3/R2 storage
- **Real-time Preview** functionality

### 📹 Video Generation Pipeline
- **Multiple Video Types**: Story, Reddit, Quiz, Educational, Viral Text
- **Remotion Integration** for professional video quality
- **Real-time Status Tracking** with progress updates
- **Background Processing** with queue management
- **Multiple Output Formats** (MP4, GIF, WebM)
- **Range Request Support** for efficient streaming

### 💬 Text Video AI Features
- **Viral Conversation Analysis** with engagement scoring
- **AI Script Generation** with multiple tones and styles
- **Trending Template Library** updated regularly
- **Platform Optimization** for TikTok, Instagram, YouTube
- **Emotional Arc Analysis** for maximum engagement
- **Auto-formatting** for readability

### 🏆 Top 5 Content Intelligence
- **Real-time Trending Analysis** across platforms
- **AI Viral Potential Scoring** with 95% accuracy
- **Competitor Analysis** and market gap identification
- **Multi-platform Performance Prediction**
- **Content Optimization Suggestions**
- **Automated Thumbnail Generation**

## 🛡️ Security & Authentication

### Authentication Flow
1. **Register/Login** → Receive JWT tokens
2. **Access Token** → Include in `Authorization: Bearer <token>`
3. **Refresh Token** → Use to get new access tokens
4. **Secure Endpoints** → Protected with middleware validation

### Security Features
- **bcrypt Password Hashing** with salt rounds
- **JWT Token Expiration** (1 hour access, 7 days refresh)
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Configuration** for secure cross-origin requests
- **Request ID Tracking** for audit trails

## 📈 Performance & Optimization

### Caching Strategy
- **Redis Caching** for frequently accessed data
- **Voice Cache** for repeated generation requests
- **API Response Caching** with intelligent invalidation
- **CDN Integration** for asset delivery
- **Database Query Optimization** with indexing

### Scalability Features
- **Background Job Processing** with BullMQ
- **Horizontal Scaling Support** with stateless design
- **Load Balancer Ready** with health checks
- **Database Connection Pooling**
- **Memory Management** with garbage collection optimization

## 🐛 Troubleshooting

### Common Issues

#### API Connection Problems
```bash
# Check server status
curl http://localhost:3000/health

# Verify environment variables
node -e "console.log(process.env.ELEVENLABS_API_KEY ? 'ElevenLabs: OK' : 'ElevenLabs: Missing')"
```

#### Authentication Errors
```bash
# Test auth endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Check token format (should be JWT)
echo "YOUR_TOKEN" | cut -d'.' -f2 | base64 -d
```

#### Voice Generation Issues
```bash
# Test ElevenLabs connection
curl http://localhost:3000/api/voices/test/connection

# Check voice list
curl http://localhost:3000/api/voices/list
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=reelspeed:* npm run dev

# Check logs
tail -f server.log
```

## 🤝 Contributing

### API Documentation Updates
1. Modify source code comments and JSDoc
2. Update OpenAPI specification in `openapi.yaml`
3. Regenerate documentation:
   ```bash
   npm run docs:generate
   ```
4. Test all endpoints with updated examples
5. Submit PR with documentation changes

### Adding New Endpoints
1. Create route file in `src/routes/`
2. Add endpoint documentation to OpenAPI spec
3. Update Postman collection
4. Add examples to markdown documentation
5. Include cURL examples

## 📞 Support

### Documentation Resources
- **📖 Full API Guide**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **🌐 Interactive Testing**: [api-docs.html](./api-docs.html)
- **📮 Postman Collection**: [ReelSpeed-API.postman_collection.json](./ReelSpeed-API.postman_collection.json)
- **⚙️ OpenAPI Spec**: [openapi.yaml](./openapi.yaml)

### Getting Help
- **Health Check**: `GET /health` for system status
- **Connection Test**: `GET /api/voices/test/connection` for service status
- **Error Codes**: Check response `code` field for specific error types
- **Request IDs**: Include `requestId` from responses when reporting issues

### Development Team
- **API Architecture**: Node.js + TypeScript + Express
- **Database**: MongoDB with Mongoose ODM
- **AI Services**: ElevenLabs, OpenAI, Whisper
- **Storage**: AWS S3 / Cloudflare R2
- **Caching**: Redis with fallback strategies

---

**Ready to build amazing viral videos with AI?** 🚀

Start with the [Interactive Documentation](./api-docs.html) for immediate testing, or dive deep into the [Complete API Guide](./API_DOCUMENTATION.md) for comprehensive integration information.

*Documentation generated for ReelSpeed Backend API v1.0.0*