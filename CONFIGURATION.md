# ReelSpeed Backend Configuration Guide

## 🚀 Quick Start

### 1. Environment Setup

The backend uses a hierarchical configuration system that loads environment variables from:

1. `.env` (service-specific config)
2. `../.env.local` (monorepo local config)
3. `../.env.development` (monorepo development config)
4. `../.env` (monorepo general config)

### 2. Required Configuration

**Current Working Configuration:**

```bash
# Storage
STORAGE_PROVIDER=cloudflare

# ElevenLabs (WORKING)
ELEVENLABS_API_KEY=sk_2b6c60fc128b3b0a5b7bb4e05f2ae2837bfac8235940f2a9

# Cloudflare R2 (WORKING)
R2_ACCOUNT_ID=9bea933aa07c0f1b14d09913fe64d48b
R2_ACCESS_KEY_ID=f9cc095ccbecf50b6f6713121a23bd0b
R2_SECRET_ACCESS_KEY=47713fe688b28be68e81a1b88e9d5060e3400a504900d16012998afa7a484800
R2_BUCKET_NAME=reelspeed-audio-production
R2_PUBLIC_URL=https://pub-3eff3601b36542c3a31578e174b8ad23.r2.dev

# Server
PORT=8001
CORS_ORIGIN=https://app.reelspeed.ai
```

## 📋 Commands

### Development
```bash
npm run dev          # Start development server
npm run validate     # Validate configuration
npm run build        # Build TypeScript
npm run lint         # Check code quality
```

### Production
```bash
npm run build        # Build for production
npm run start        # Start production server
npm run validate:prod # Validate production config
```

## ✅ Validation

Run the configuration validator to ensure everything is working:

```bash
npm run validate
```

**Expected Output:**
```
🔧 ReelSpeed Backend Configuration Validation
✅ ELEVENLABS_API_KEY: Present
✅ R2_ACCOUNT_ID: Present
✅ R2_ACCESS_KEY_ID: Present
✅ R2_SECRET_ACCESS_KEY: Present
✅ R2_BUCKET_NAME: Present
✅ STORAGE_PROVIDER: Present
✅ ElevenLabs API Key: Valid format
✅ Storage Provider: Cloudflare R2
✅ TypeScript Build: Success
✅ Backend Server: Started successfully
✅ Health Endpoint: Responding

🎉 Backend configuration is valid and ready for deployment!
```

## 🌐 Frontend Connection

Make sure your frontend (reelspeed-app) has the correct API URL:

```bash
# Frontend .env
VITE_API_URL=http://localhost:8001
VITE_VIDEO_SERVICE_URL=http://localhost:3001
```

## 🚀 Deployment

### Local Development
1. Ensure environment variables are set in `.env` or monorepo `.env.local`
2. Run `npm run validate` to check configuration
3. Start with `npm run dev`

### Production Deployment
1. Use `.env.production` for production-specific settings
2. Ensure JWT secrets are changed for production
3. Run `npm run validate:prod` before deployment
4. Build with `npm run build`
5. Start with `npm run start`

## 🔧 Troubleshooting

### Common Issues

1. **Port 8001 in use**: Kill existing processes or change PORT in .env
2. **Storage not working**: Verify R2 credentials and STORAGE_PROVIDER=cloudflare
3. **ElevenLabs API errors**: Check API key format (should start with sk_)
4. **Frontend can't connect**: Ensure VITE_API_URL=http://localhost:8001

### Health Check

Backend health: `curl http://localhost:8001/health`

Expected response: `{"status":"OK","timestamp":"..."}`

## 📁 File Structure

```
reelspeed-backend/
├── .env                    # Service-specific config
├── .env.production        # Production overrides
├── validate-config.js     # Configuration validator
├── src/config/           # Configuration system
└── CONFIGURATION.md      # This guide
```

## 🔑 Security Notes

- **Never commit API keys** to version control
- **Change JWT secrets** for production deployment
- **Use environment-specific** .env files
- **Validate configuration** before deployment