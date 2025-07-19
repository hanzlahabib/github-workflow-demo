import path from 'path';
import { initializeAIServices, type AIServicesConfig } from '../services';

// Local development configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Get the video service path - assuming it's a sibling directory
const videoServicePath = path.resolve(__dirname, '../../../reelspeed-video-service');

// Create renders directory if it doesn't exist
const rendersDir = path.join(videoServicePath, 'renders');

export const serviceConfig: AIServicesConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'mock_openai_key',
    organization: process.env.OPENAI_ORGANIZATION,
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || 'mock_elevenlabs_key',
  },
  whisper: {
    apiKey: process.env.OPENAI_API_KEY || 'mock_openai_key',
  },
  dalle: {
    apiKey: process.env.OPENAI_API_KEY || 'mock_openai_key',
  },
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock_access_key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock_secret_key',
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET_NAME || 'reelspeed-videos-local',
  },
  remotion: {
    compositionsPath: videoServicePath,
    outputDir: rendersDir,
    lambdaRegion: process.env.AWS_REGION || 'us-east-1',
    lambdaRole: process.env.LAMBDA_ROLE,
  },
};

// Initialize services function
export async function initializeVideoServices() {
  try {
    console.log('[Services] Initializing video services...');
    console.log('[Services] Video service path:', videoServicePath);
    console.log('[Services] Renders directory:', rendersDir);
    
    // Initialize all AI services
    initializeAIServices(serviceConfig);
    
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