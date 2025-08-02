# ReelSpeed Simplified Lambda Implementation

Clean, Clippie-style Lambda video rendering implementation.

## 🎯 Overview

This simplified Lambda implementation matches Clippie's approach:
- **Single configuration file** with environment overrides
- **Clean API endpoints** matching Clippie's format
- **Simple progress monitoring** with 2-second polling
- **Minimal error handling** without over-engineering
- **Direct S3 output** with presigned URLs

## 📁 Key Files

```
src/
├── config/
│   └── lambda.config.ts         # Unified Lambda configuration
├── services/
│   └── simpleLambdaService.ts   # Clean Lambda service (150 lines)
├── routes/
│   └── lambda.ts                # API routes matching Clippie
└── server.ts                    # Updated to include Lambda routes

deploy-lambda-unified.ts         # Single deployment script
test-lambda-simplified.js        # Validation tests
```

## 🚀 Quick Start

### 1. Deploy Lambda Infrastructure
```bash
npm run deploy-lambda
```

### 2. Test Implementation
```bash
npm run test-lambda
```

### 3. Start Backend
```bash
npm run dev
```

## 🔧 API Endpoints

### Start Render
```http
POST /api/lambda/render
Content-Type: application/json

{
  "id": "demo",
  "inputProps": {
    "conversations": [...],
    "messageMetadata": {...},
    "durationInSeconds": 30
  },
  "fileName": "video.mp4",
  "videoId": "unique-id"
}
```

**Response:**
```json
{
  "renderId": "abc123",
  "bucketName": "remotionlambda-useast1-reelspeed",
  "cloudWatchLogs": "https://...",
  "folderInS3Console": "https://...",
  "progressJsonInConsole": "https://..."
}
```

### Check Progress
```http
POST /api/lambda/progress
Content-Type: application/json

{
  "id": "abc123",
  "bucketName": "remotionlambda-useast1-reelspeed"
}
```

**Response (In Progress):**
```json
{
  "type": "progress",
  "progress": 0.45
}
```

**Response (Complete):**
```json
{
  "type": "done",
  "url": "https://s3.../video.mp4",
  "size": 12345678
}
```

## ⚙️ Configuration

### Environment Variables
```bash
# Optional overrides
LAMBDA_FUNCTION_NAME=reelspeed-lambda-renderer
LAMBDA_BUCKET_NAME=remotionlambda-useast1-reelspeed  
LAMBDA_REGION=us-east-1
LAMBDA_SITE_URL=https://...
LAMBDA_MEMORY=3008
LAMBDA_TIMEOUT=600
```

### Environment-Specific Configs
- **Development**: Lower timeout, debugging enabled
- **Production**: Full timeout, insights disabled
- **Test**: Minimal resources for testing

## 🧪 Testing

### Test Configuration
```bash
npm run test-lambda-config
```

### Test API Endpoints
```bash
npm run test-lambda-api
```

### Full Test Suite
```bash
npm run test-lambda
```

### Test Render (with actual Lambda)
```bash
curl -X POST http://localhost:8001/api/lambda/test
```

## 📊 Performance Optimizations

### Lambda Settings
- **Memory**: 3008MB (maximum for best performance)
- **Timeout**: 600s (10 minutes for complex videos)
- **Disk**: 4096MB (ample space for assets)
- **Concurrency**: 4 per Lambda (full CPU utilization)
- **Frames**: 30 per Lambda (balanced progress updates)

### Cost Optimization
- **Insights disabled** in production
- **ARM64 architecture** for cost savings (if compatible)
- **Automatic cleanup** of old deployments
- **Efficient progress polling** (2-second intervals)

## 🔄 Deployment Process

The unified deployment script:

1. **Cleanup**: Removes old functions/sites (keeps 2 recent)
2. **Deploy Function**: Creates optimized Lambda function
3. **Deploy Site**: Bundles and uploads video service
4. **Update Config**: Automatically updates environment files
5. **Validate**: Tests function and site accessibility

## 🆚 Comparison to Previous Implementation

| Aspect | Before | After |
|--------|--------|-------|
| **Files** | 7 services, 400+ lines each | 3 files, 150 lines total |
| **Config** | 7+ environment files | 1 config file |
| **Deployment** | 2 conflicting scripts | 1 unified script |
| **Progress** | Complex adaptive polling | Simple 2s polling |
| **Errors** | 200+ lines retry logic | Basic retry with backoff |
| **Architecture** | Multi-tier orchestration | Direct Lambda calls |

## 🐛 Troubleshooting

### Lambda Not Configured
```bash
# Check status
curl http://localhost:8001/api/lambda/status

# Deploy if needed
npm run deploy-lambda
```

### Backend Not Running
```bash
npm run dev
```

### Deployment Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Validate config
npm run test-lambda-config
```

### Video Generation Issues
```bash
# Test with minimal payload
curl -X POST http://localhost:8001/api/lambda/test

# Check CloudWatch logs via provided URLs
```

## 💡 Next Steps

1. **Frontend Integration**: Update frontend to use new `/api/lambda/*` endpoints
2. **Error Monitoring**: Add CloudWatch alerts for failed renders
3. **Cost Monitoring**: Set up billing alerts for Lambda usage
4. **Performance Tuning**: Optimize based on real usage patterns
5. **Multi-Region**: Deploy to additional regions for global coverage

---

**Migration Complete**: The simplified Lambda implementation is now ready and matches Clippie's proven approach.