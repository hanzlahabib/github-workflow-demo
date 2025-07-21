# Audio Storage Strategy

## Overview

ReelSpeed.ai implements a comprehensive audio storage strategy using environment-specific Cloudflare R2 buckets for optimal cost management, security, and lifecycle automation.

## Architecture

### Environment-Based Bucket Strategy

We use a **3-bucket approach** optimized for solo developer management:

```
reelspeed-audio-dev      # Development environment
reelspeed-audio-staging  # Staging environment  
reelspeed-audio-prod     # Production environment
```

### Audio Types and Retention Policies

| Audio Type | Development | Staging | Production | Use Case |
|------------|-------------|---------|------------|----------|
| **Voiceovers** | 3 days | 14 days | 90 days | Main video narration |
| **Messages** | 1 day | 7 days | 30 days | Individual message audio |
| **Previews** | 12 hours | 1 day | 7 days | Voice previews and samples |
| **System** | Permanent | Permanent | Permanent | System sounds, notifications |

## Configuration

### Environment Configurations

#### Development
- **Bucket**: `reelspeed-audio-dev`
- **ACL**: `public-read` (easier testing)
- **Compression**: Disabled (faster uploads)
- **Backup**: Disabled
- **Signed URL Expiry**: 24 hours

#### Staging
- **Bucket**: `reelspeed-audio-staging`
- **ACL**: `private`
- **Compression**: Enabled (test compression)
- **Backup**: Disabled
- **Signed URL Expiry**: 4 hours

#### Production
- **Bucket**: `reelspeed-audio-prod`
- **ACL**: `private`
- **Compression**: Enabled (bandwidth optimization)
- **Backup**: Enabled (data protection)
- **Signed URL Expiry**: 1 hour (security)

## File Organization

### Storage Paths

```
audio/
├── voiceovers/
│   └── {userId}/
│       └── {timestamp}_{id}.mp3
├── messages/
│   └── {userId}/
│       └── {messageId}_{timestamp}.mp3
├── previews/
│   └── {userId}/
│       └── temp_{timestamp}_{id}.mp3
└── system/
    └── {id}_{randomId}.mp3
```

### Metadata Structure

Each audio file includes comprehensive metadata:

```json
{
  "user-id": "user123",
  "content-type": "voiceover|message|preview|system",
  "generated-at": "2024-01-15T10:30:00Z",
  "expires-at": "2024-01-18T10:30:00Z",
  "voice-id": "pNInz6obpgDQGcFmaJgB",
  "duration": "5000",
  "original-filename": "script_audio.mp3",
  "environment": "production"
}
```

## Lifecycle Management

### Automated Cleanup

The system includes automated cleanup workers that run on environment-specific schedules:

- **Development**: Every 6 hours (frequent cleanup for dev)
- **Staging**: Every 12 hours
- **Production**: Daily at 2 AM UTC

### Cleanup Process

1. **Scan**: List all audio files with `audio/` prefix
2. **Filter**: Check metadata for expiry dates
3. **Batch Delete**: Remove expired files in batches of 1000
4. **Statistics**: Track deleted files and freed space
5. **Logging**: Comprehensive cleanup reporting

## Cost Optimization

### Storage Costs (Monthly Estimates)

| Environment | Min Cost | Max Cost | Usage Profile |
|-------------|----------|----------|---------------|
| Development | $2 | $5 | Limited testing data |
| Staging | $10 | $25 | Client demos, testing |
| Production | $50 | $200 | Full user base |

### Cost Reduction Features

- **Automatic Expiration**: Prevents storage bloat
- **Compression**: Reduces file sizes in staging/production
- **Short Retention**: Aggressive cleanup in development
- **Batch Operations**: Efficient S3 API usage

## API Endpoints

### Audio Generation

```bash
# Generate voiceover audio
POST /api/voices/generate-voiceover-audio
{
  "script": "Hello world",
  "selectedVoiceId": "voice_id",
  "ownerId": "user123"
}

# Generate message audio  
POST /api/voices/generate-message
{
  "messageId": "msg123",
  "text": "Hello there",
  "voiceId": "voice_id"
}

# Generate voice preview
POST /api/voices/preview
{
  "voiceId": "voice_id",
  "text": "Preview text"
}
```

### Storage Management

```bash
# Get storage statistics
GET /api/voices/storage/stats

# Manual cleanup (testing)
POST /api/voices/storage/cleanup
```

## Security

### Access Control

- **Development**: Public read access for easy testing
- **Staging/Production**: Private with signed URLs
- **Signed URLs**: Time-limited access (1-24 hours)

### Data Protection

- **Metadata**: No sensitive data in file names
- **Expiration**: Automatic cleanup prevents data retention issues
- **Environment Isolation**: Separate buckets prevent cross-environment access

## Monitoring

### Storage Statistics

The system tracks:
- Total files by type
- Total storage usage
- Files expiring in next 24 hours
- Cleanup operation results

### Example Response

```json
{
  "totalFiles": 1250,
  "totalSize": 52428800,
  "filesByType": {
    "voiceover": 800,
    "message": 350,
    "preview": 90,
    "system": 10
  },
  "expiringSoon": 45
}
```

## Integration

### ElevenLabs Integration

All ElevenLabs-generated audio automatically uses the new storage strategy:

```typescript
// Automatic storage with metadata
const uploadResult = await elevenLabsService.uploadAudioToS3(
  audioBuffer,
  'voiceover',
  userId,
  {
    voiceId: 'voice_id',
    duration: 5000,
    originalText: 'Script text'
  }
);
```

### Video Model Integration

Audio assets are tracked in the Video model:

```typescript
audioAssets: {
  voiceoverUrls: [String],
  messageAudios: [{
    messageId: String,
    audioUrl: String,
    voiceId: String,
    expiresAt: Date
  }],
  totalDuration: Number,
  generatedAt: Date
}
```

## Best Practices

### For Developers

1. **Test Locally**: Use development bucket for testing
2. **Monitor Costs**: Check storage stats regularly
3. **Handle Expiration**: Account for audio expiration in UI
4. **Error Handling**: Graceful fallbacks for expired audio

### For Production

1. **Signed URLs**: Always use time-limited access
2. **Backup Strategy**: Regular backups in production
3. **Monitor Cleanup**: Verify automated cleanup is working
4. **Cost Alerts**: Set up billing alerts for storage costs

## Troubleshooting

### Common Issues

**Audio not accessible**: Check expiration date and generate new signed URL
**High storage costs**: Verify cleanup workers are running
**Upload failures**: Check bucket permissions and AWS credentials
**Missing metadata**: Ensure audio uploaded through new system

### Debug Commands

```bash
# Check cleanup worker status
GET /api/voices/storage/stats

# Manual cleanup
POST /api/voices/storage/cleanup

# Test ElevenLabs connection
GET /api/voices/debug
```

## Migration

### From Legacy System

The new storage system maintains backward compatibility:

- Legacy `uploadToS3` method still works
- New `uploadAudioToS3` method provides enhanced features
- Gradual migration of existing audio assets

### Implementation Steps

1. **Deploy Configuration**: Audio storage config
2. **Update Services**: S3 and ElevenLabs services
3. **Deploy Workers**: Automated cleanup jobs
4. **Update Routes**: Voice generation endpoints
5. **Monitor**: Verify automated cleanup and cost optimization

## Conclusion

This audio storage strategy provides:

- **Cost Optimization**: Automatic lifecycle management
- **Security**: Environment-appropriate access controls
- **Monitoring**: Comprehensive storage statistics
- **Scalability**: Designed for production workloads
- **Maintainability**: Simple 3-bucket strategy for solo development

The system balances simplicity for solo development with the robustness needed for production use.