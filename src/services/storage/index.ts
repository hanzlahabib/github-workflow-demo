// Storage service exports - clean functional interface

export type {
  StorageConfig,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDeleteResult,
  StorageListResult,
  StorageProvider,
} from './types';

export {
  createStorageProvider,
  createS3Config,
  createR2Config,
  createProviderFromEnv,
  switchProvider,
} from './factory';

export { createS3Provider } from './aws-s3';
export { createR2Provider } from './cloudflare-r2';

// Default export for convenience
export { createProviderFromEnv as default } from './factory';