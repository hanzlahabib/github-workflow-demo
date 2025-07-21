import path from 'path';
import { initializeAIServices } from '../services';

// Local development configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Get the video service path - assuming it's a sibling directory
const videoServicePath = path.resolve(__dirname, '../../../reelspeed-video-service');

// Create renders directory if it doesn't exist
const rendersDir = path.join(videoServicePath, 'renders');

// Get configuration from centralized config
import { getAIConfig, getStorageConfig, getRemotionConfig } from './index';

const aiConfig = getAIConfig();
const storageConfig = getStorageConfig();
const remotionConfig = getRemotionConfig();

// Service configuration is now handled by ServiceRegistry
// The centralized config provides the necessary configuration values
export const serviceConfig = {
  openai: {
    apiKey: aiConfig.openai.apiKey,
    organization: aiConfig.openai.orgId,
  },
  elevenlabs: {
    apiKey: aiConfig.elevenlabs.apiKey,
  },
  whisper: {
    apiKey: aiConfig.openai.apiKey,
  },
  dalle: {
    apiKey: aiConfig.openai.apiKey,
  },
  s3: storageConfig.provider === 'aws' && storageConfig.aws ? {
    accessKeyId: storageConfig.aws.accessKeyId,
    secretAccessKey: storageConfig.aws.secretAccessKey,
    region: storageConfig.aws.region,
    bucketName: storageConfig.aws.bucket,
  } : {
    accessKeyId: 'mock_access_key',
    secretAccessKey: 'mock_secret_key',
    region: 'us-east-1',
    bucketName: 'reelspeed-videos-local',
  },
  remotion: {
    compositionsPath: videoServicePath,
    outputDir: rendersDir,
    lambdaRegion: remotionConfig.lambdaRegion,
    lambdaRole: remotionConfig.lambdaRole,
  },
};

// Initialize services function using new standardized patterns
export async function initializeVideoServices() {
  try {
    console.log('[Services] Initializing video services with new standardized patterns...');
    console.log('[Services] Video service path:', videoServicePath);
    console.log('[Services] Renders directory:', rendersDir);

    // Initialize all AI services using new ServiceRegistry
    await initializeAIServices();

    console.log('[Services] Video services initialized successfully');
    return true;
  } catch (error) {
    console.error('[Services] Failed to initialize video services:', error);

    if (isDevelopment) {
      console.warn('[Services] Running in development mode - some services may use mock implementations');
      return false;
    }

    throw error;
  }
}

export default serviceConfig;
