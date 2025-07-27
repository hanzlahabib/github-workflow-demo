# ReelSpeed.ai - Backend API Service

## Overview

Node.js Express API server providing video generation, user management, and AI service integration for ReelSpeed.ai. Currently implements basic video endpoints with **critical security gaps** that must be addressed before production deployment.

**Status: Basic implementation with unprotected endpoints - NOT PRODUCTION READY**

## Architecture

**Tech Stack:**
- Node.js with Express 5
- TypeScript for type safety
- MongoDB with Mongoose ODM
- Redis for job queues (BullMQ)
- Socket.io for real-time updates

**Port:** `3000` (development)

## Implementation Status

### ✅ Implemented
- **Basic Express Server**
  - CORS configuration
  - JSON middleware
  - Route structure
  - Error handling framework

- **Database Models**
  - User, Video, Job, Template, Caption models
  - MongoDB connection setup
  - Mongoose schemas defined

- **AI Service Integrations**
  - OpenAI GPT-4 service structure
  - ElevenLabs voice generation (partial)
  - Whisper transcription (structure only)
  - DALL-E image generation (planned)

- **Video Generation Endpoints**
  - Text story video generation
  - Basic Remotion integration
  - File upload handling
  - Job queue setup with BullMQ

### ⚠️ Partially Implemented
- **Authentication System** (15% complete)
  - JWT middleware exists but not applied
  - Password hashing with bcrypt
  - User registration/login routes (not integrated)
  - No session management

- **Voice Services** (40% complete)
  - ElevenLabs API integration working
  - Voice generation endpoints
  - Audio file storage (R2/S3)
  - Limited error handling

- **Database Integration** (30% complete)
  - Models defined but limited usage
  - No user data persistence
  - Basic video metadata storage
  - No relationship management

### ❌ Critical Missing Features
- **Route Protection**
  - No authentication guards on endpoints
  - All video generation endpoints public
  - No user verification for API access

- **Rate Limiting**
  - No request throttling
  - Unlimited API usage possible
  - **COST RISK:** $500-1000/day potential abuse

- **Input Validation**
  - No request sanitization
  - XSS vulnerability in user content
  - No file upload security
  - SQL injection potential

- **Security Middleware**
  - No helmet.js protection
  - No CSRF protection
  - No request logging
  - No DDoS protection

## API Endpoints

### Video Generation
```
POST /api/video/generate     # ⚠️ UNPROTECTED
POST /api/video/text-story   # ⚠️ UNPROTECTED
GET  /api/video/:id          # ⚠️ UNPROTECTED
```

### Authentication (Not Integrated)
```
POST /api/auth/register      # Structure only
POST /api/auth/login         # Structure only
GET  /api/auth/profile       # Structure only
POST /api/auth/refresh       # Structure only
```

### Voice Services
```
GET  /api/voices/list        # ⚠️ UNPROTECTED
POST /api/voices/generate    # ⚠️ UNPROTECTED - COST RISK
GET  /api/voices/preview     # ⚠️ UNPROTECTED
```

### Templates & Assets
```
GET  /api/templates          # Public (appropriate)
POST /api/assets/upload      # ⚠️ UNPROTECTED - SECURITY RISK
```

## Development

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Redis 6+ (for job queues)
- AWS S3 or Cloudflare R2 credentials
- API Keys: OpenAI, ElevenLabs

### Setup
```bash
cd reelspeed-backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

npm run dev
```

### Available Commands
```bash
npm run dev          # Development with nodemon
npm run build        # TypeScript compilation to dist/
npm start            # Production server
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix linting issues
npm run test-server  # Test server functionality
```

### Environment Variables
Create `.env` with:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/reelspeed
REDIS_URL=redis://localhost:6379

# API Keys (REQUIRED)
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# Storage (AWS S3 or Cloudflare R2)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=reelspeed-assets
S3_REGION=us-east-1

# Server Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here

# Video Service
VIDEO_SERVICE_URL=http://localhost:3001
```

## Security Issues

### 🚨 CRITICAL VULNERABILITIES

1. **Unprotected Endpoints**
   ```
   ⚠️ ANY USER CAN:
   - Generate unlimited videos (cost explosion)
   - Access all video files
   - Upload malicious files
   - Abuse AI APIs without limits
   ```

2. **No Rate Limiting**
   ```
   ⚠️ ATTACK VECTORS:
   - DDoS attacks
   - API cost explosion ($500-1000/day)
   - Service degradation
   - Resource exhaustion
   ```

3. **Input Validation Missing**
   ```
   ⚠️ VULNERABILITIES:
   - XSS in user content
   - Code injection
   - File upload attacks
   - Database injection
   ```

4. **Authentication Bypass**
   ```
   ⚠️ ANYONE CAN:
   - Access user data
   - Generate content as any user
   - Modify video settings
   - Access premium features
   ```

### Immediate Security Requirements

**MUST IMPLEMENT BEFORE ANY PUBLIC ACCESS:**

1. **Authentication Middleware**
   ```typescript
   // Apply to all protected routes
   app.use('/api/video', authenticateToken);
   app.use('/api/voices', authenticateToken);
   app.use('/api/user', authenticateToken);
   ```

2. **Rate Limiting**
   ```typescript
   // Prevent API abuse
   const rateLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

3. **Input Validation**
   ```typescript
   // Validate all user inputs
   const validateVideoRequest = [
     body('title').isLength({min: 1, max: 100}).escape(),
     body('content').isLength({min: 1, max: 5000}).escape()
   ];
   ```

4. **File Upload Security**
   ```typescript
   // Secure file handling
   const upload = multer({
     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
     fileFilter: secureFileFilter
   });
   ```

## AI Service Integrations

### OpenAI GPT-4
- **Status:** Service structure ready
- **Usage:** Content generation, optimization
- **Security:** API key protection needed
- **Cost Control:** Rate limiting required

### ElevenLabs Voice
- **Status:** Basic integration working
- **Features:** Voice synthesis, preview generation
- **Storage:** Audio files in R2/S3
- **Issues:** No usage tracking or limits

### Whisper Transcription
- **Status:** Structure only
- **Planned:** Audio transcription for captions
- **Implementation:** Not started

### DALL-E Image Generation
- **Status:** Structure only
- **Planned:** Custom image generation
- **Implementation:** Not started

## Database Schema

### Users
```typescript
{
  email: string,
  password: string (hashed),
  subscription: 'free' | 'premium',
  videosGenerated: number,
  createdAt: Date
}
```

### Videos
```typescript
{
  userId: ObjectId,
  title: string,
  type: 'text-story' | 'top5' | 'twitter',
  config: VideoConfig,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  outputUrl?: string,
  createdAt: Date
}
```

### Jobs
```typescript
{
  videoId: ObjectId,
  type: string,
  status: JobStatus,
  progress: number,
  errorMessage?: string,
  createdAt: Date
}
```

## Performance Considerations

### Current Limitations
- Synchronous video generation (blocking)
- No caching for frequently requested data
- Large file uploads block the event loop
- No horizontal scaling setup

### Optimization Needs
- Implement async job processing
- Add Redis caching layer
- Stream large file uploads
- Load balancer configuration

## Testing

### Current Status
- Basic API endpoint tests exist
- Integration tests partially implemented
- No security testing
- No load testing

### Test Coverage Needed
- Authentication flow testing
- Rate limiting verification
- Input validation testing
- Security vulnerability scanning

## Deployment

### ❌ NOT PRODUCTION READY

**Blockers:**
1. Security implementation (critical)
2. Authentication system completion
3. Rate limiting implementation
4. Input validation and sanitization

### Production Requirements
- SSL/TLS certificate
- Environment variable security
- Database connection pooling
- Log aggregation setup
- Health check endpoints
- Monitoring and alerting

## Related Services

- **Frontend App:** `../reelspeed-app/` - React application
- **Video Service:** `../reelspeed-video-service/` - Remotion rendering
- **Marketing Site:** `../reelspeed-marketing/` - Public website

## Development Workflow

### Before Making Changes
1. Run linting: `npm run lint`
2. Test critical endpoints manually
3. Verify environment variables are set
4. Check MongoDB and Redis connections

### Testing Endpoints
```bash
# Test video generation (works but unprotected)
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "text-story", "config": {...}}'

# Test voice generation (works but unprotected)
curl -X POST http://localhost:3000/api/voices/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voiceId": "pNInz6obpgDQGcFmaJgB"}'
```

## Cost Management

### Current Risk
**⚠️ UNLIMITED USAGE POSSIBLE**
- OpenAI API: $0.01-0.03 per 1K tokens
- ElevenLabs: $0.30 per 1K characters
- **Potential daily cost with abuse:** $500-1000+

### Required Controls
1. User authentication and tracking
2. Usage limits per user tier
3. Rate limiting per endpoint
4. Cost monitoring and alerts
5. Emergency kill switches

## Immediate Action Items

### Week 1 (Critical)
- [ ] Implement authentication middleware
- [ ] Add rate limiting to all endpoints
- [ ] Secure file upload validation
- [ ] Input sanitization for all user data

### Week 2 (Security)
- [ ] Complete user registration/login flow
- [ ] Add session management
- [ ] Implement CSRF protection
- [ ] Add request logging

### Week 3 (Business Logic)
- [ ] User subscription management
- [ ] Usage tracking and limits
- [ ] Payment webhook integration
- [ ] Video ownership enforcement

### Week 4 (Production Ready)
- [ ] Health check endpoints
- [ ] Error monitoring setup
- [ ] Performance optimization
- [ ] Deployment pipeline

---

**⚠️ CRITICAL WARNING:** This backend has significant security vulnerabilities and is NOT suitable for production deployment. All endpoints are currently unprotected, creating serious cost and security risks. Authentication and rate limiting must be implemented before any public access.