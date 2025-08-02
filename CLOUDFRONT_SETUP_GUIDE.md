
# CloudFront CDN Setup Guide for Background Videos
Based on analysis of cdn-clippie.com (CloudFlare CDN)

## Overview
This guide shows how to set up AWS CloudFront distributions for both public background library and private user uploads, similar to how cdn-clippie.com uses CloudFlare.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   S3 Buckets    │    │   CloudFront    │    │   Lambda        │
│                 │    │   Distributions │    │   Rendering     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Public Library  │───→│ Public CDN      │───→│ Direct Access   │
│ reelspeed-bg-lib│    │ cdn-bg.domain   │    │ (No copying)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Private Uploads │───→│ Private CDN     │───→│ Signed URLs     │
│ reelspeed-media │    │ cdn-pvt.domain  │    │ (Time-limited)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Step 1: Create CloudFront Distributions

### Public Backgrounds Distribution
```bash
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "reelspeed-public-backgrounds-'$(date +%s)'",
  "Comment": "Public backgrounds library CDN",
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-reelspeed-backgrounds-library",
        "DomainName": "reelspeed-backgrounds-library.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-reelspeed-backgrounds-library",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 86400,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "Enabled": true,
  "Aliases": {
    "Quantity": 1,
    "Items": ["cdn-backgrounds.your-domain.com"]
  }
}'
```

### Private Uploads Distribution
```bash
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "reelspeed-private-uploads-'$(date +%s)'",
  "Comment": "Private user uploads CDN with signed URLs",
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-reelspeed-media-storage",
        "DomainName": "reelspeed-media-storage.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/YOUR-OAI-ID"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-reelspeed-media-storage",
    "ViewerProtocolPolicy": "https-only",
    "MinTTL": 3600,
    "TrustedSigners": {
      "Enabled": true,
      "Quantity": 1,
      "Items": ["YOUR-AWS-ACCOUNT-ID"]
    }
  },
  "Enabled": true,
  "Aliases": {
    "Quantity": 1,
    "Items": ["cdn-private.your-domain.com"]
  }
}'
```

## Step 2: Configure DNS (CNAME)

Add CNAME records in your DNS provider:

```
cdn-backgrounds.your-domain.com → d123abc.cloudfront.net
cdn-private.your-domain.com     → d456def.cloudfront.net
```

## Step 3: Environment Variables

Add to your .env file:

```bash
# CloudFront Configuration
PUBLIC_CDN_DOMAIN=cdn-backgrounds.your-domain.com
PRIVATE_CDN_DOMAIN=cdn-private.your-domain.com
PUBLIC_DISTRIBUTION_ID=E123ABCDEFGHIJ
PRIVATE_DISTRIBUTION_ID=E456DEFGHIJKLM

# CDN Strategy: 'lambda-copy', 'cloudfront-signed', 'hybrid'
CDN_STRATEGY=hybrid

# CloudFront Key Pair (for signed URLs)
CLOUDFRONT_PRIVATE_KEY_ID=APKAI...
CLOUDFRONT_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

## Step 4: Generate CloudFront Key Pair

```bash
# Create key pair for signed URLs
aws cloudfront create-key-group --key-group-config '{
  "Name": "reelspeed-private-key-group",
  "Items": ["YOUR-PUBLIC-KEY-ID"],
  "Comment": "Key group for private video access"
}'
```

## Step 5: Update Backend Service

Replace your current background service with AdvancedBackgroundVideoService:

```javascript
const { AdvancedBackgroundVideoService } = require('./services/advancedBackgroundVideoService');

const backgroundService = new AdvancedBackgroundVideoService();

// In your video generation endpoint
const optimizedBackgroundUrl = await backgroundService.getOptimizedBackgroundUrl(
  backgroundConfig,
  userId,
  videoId
);
```

## Benefits vs Current Solution

| Feature | Current (Lambda Copy) | CloudFront CDN |
|---------|----------------------|----------------|
| Performance | Good | Excellent |
| Bandwidth Cost | Higher | Lower |
| Global CDN | No | Yes |
| Privacy Control | Good | Excellent |
| Setup Complexity | Low | Medium |
| Scalability | Good | Excellent |

## Migration Strategy

1. **Phase 1**: Keep current Lambda copy working (done ✅)
2. **Phase 2**: Set up CloudFront distributions
3. **Phase 3**: Deploy AdvancedBackgroundVideoService with 'hybrid' strategy
4. **Phase 4**: Test CloudFront signed URLs
5. **Phase 5**: Switch to 'cloudfront-signed' strategy
6. **Phase 6**: Monitor performance and costs

## Performance Comparison

Based on cdn-clippie.com analysis:
- ✅ Range requests supported (video streaming)
- ✅ Global edge locations
- ✅ Smart caching (DYNAMIC cache status)
- ✅ Custom domain support
- ✅ 17.78 MB video served efficiently

Your CloudFront setup will provide similar performance benefits.
