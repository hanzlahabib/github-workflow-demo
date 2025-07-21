/**
 * Environment-based Audio Storage Configuration
 * Simple 3-bucket strategy for solo developer
 */

export interface AudioStorageConfig {
  bucket: string;
  retention: {
    voiceovers: number | null; // days (null = permanent)
    messages: number | null;
    previews: number | null;
    system: number | null;
  };
  acl: 'private' | 'public-read';
  compression: boolean;
  backup: boolean;
  signedUrlExpiry: number; // seconds
}

const DEV_CONFIG: AudioStorageConfig = {
  bucket: 'reelspeed-audio-dev',
  retention: {
    voiceovers: 3,   // 3 days - quick cleanup for dev
    messages: 1,     // 1 day
    previews: 0.5,   // 12 hours
    system: null     // permanent
  },
  acl: 'public-read', // Easy testing in development
  compression: false, // Fast uploads for dev
  backup: false,
  signedUrlExpiry: 24 * 60 * 60 // 24 hours - long for dev testing
};

const STAGING_CONFIG: AudioStorageConfig = {
  bucket: 'reelspeed-audio-staging',
  retention: {
    voiceovers: 14,  // 2 weeks - enough for client demos
    messages: 7,     // 1 week
    previews: 1,     // 1 day
    system: null
  },
  acl: 'private',
  compression: true, // Test compression in staging
  backup: false,     // Not needed for staging
  signedUrlExpiry: 4 * 60 * 60 // 4 hours
};

const PROD_CONFIG: AudioStorageConfig = {
  bucket: 'reelspeed-audio-prod',
  retention: {
    voiceovers: 90,  // 3 months - reasonable for user content
    messages: 30,    // 1 month - conversation audio
    previews: 1,     // 1 day - temp files
    system: null     // permanent - voice samples
  },
  acl: 'private',
  compression: true,  // Save bandwidth and storage
  backup: true,       // Weekly backups for production
  signedUrlExpiry: 1 * 60 * 60 // 1 hour - secure for production
};

/**
 * Get audio storage configuration based on environment
 */
export const getAudioStorageConfig = (): AudioStorageConfig => {
  const env = process.env.NODE_ENV || 'development';

  const configs: { [key: string]: AudioStorageConfig } = {
    development: DEV_CONFIG,
    staging: STAGING_CONFIG,
    production: PROD_CONFIG,
  };

  const config = configs[env] || DEV_CONFIG;

  console.log(`[AudioStorage] Using ${env} configuration:`, {
    bucket: config.bucket,
    retention: config.retention,
    acl: config.acl
  });

  return config;
};

/**
 * Calculate expiry date based on content type and environment
 */
export const calculateExpiryDate = (type: AudioType): Date | null => {
  const config = getAudioStorageConfig();

  // Map singular types to plural retention keys
  const retentionKeyMap: Record<AudioType, keyof AudioStorageConfig['retention']> = {
    voiceover: 'voiceovers',
    message: 'messages',
    preview: 'previews',
    system: 'system'
  };

  const retentionKey = retentionKeyMap[type];
  const retentionDays = config.retention[retentionKey];

  if (retentionDays === null) {
    return null; // No expiry
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + retentionDays);
  return expiryDate;
};

/**
 * Get storage costs estimation for different environments
 */
export const getStorageCostEstimate = (env: string): { min: number; max: number; currency: string } => {
  const estimates = {
    development: { min: 2, max: 5, currency: 'USD' },
    staging: { min: 10, max: 25, currency: 'USD' },
    production: { min: 50, max: 200, currency: 'USD' },
  };

  return estimates[env as keyof typeof estimates] || estimates.development;
};

/**
 * Audio storage paths and naming conventions
 */
export const AUDIO_PATHS = {
  VOICEOVERS: 'audio/voiceovers',
  MESSAGES: 'audio/messages',
  PREVIEWS: 'audio/previews',
  SYSTEM: 'audio/system'
} as const;

export type AudioType = 'voiceover' | 'message' | 'preview' | 'system';

/**
 * Content type mappings for audio files
 */
export const AUDIO_CONTENT_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg'
} as const;

export default {
  getAudioStorageConfig,
  calculateExpiryDate,
  getStorageCostEstimate,
  AUDIO_PATHS,
  AUDIO_CONTENT_TYPES
};
