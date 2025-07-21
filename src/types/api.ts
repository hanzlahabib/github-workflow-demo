/**
 * Standardized API Response Types
 * Provides consistent structure for all API responses
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: ResponseMeta;
}

export interface APIError {
  message: string;
  code: string;
  details?: any;
  field?: string; // For validation errors
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
}

export interface PaginationMeta extends ResponseMeta {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Common error codes - use enum for better type safety and runtime values
export enum ErrorCode {
  // General errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_FIELDS = 'MISSING_FIELDS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  MISSING_REFRESH_TOKEN = 'MISSING_REFRESH_TOKEN',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',

  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  VOICE_NOT_FOUND = 'VOICE_NOT_FOUND',

  // Conflict errors
  CONFLICT = 'CONFLICT',
  USER_EXISTS = 'USER_EXISTS',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // Business logic errors
  LIMIT_REACHED = 'LIMIT_REACHED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_STATUS = 'INVALID_STATUS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // Validation specific errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  MISSING_USER_ID = 'MISSING_USER_ID',

  // Service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT'
}

// HTTP Status codes mapping - use const assertion for better type safety
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

// Common success response interface
export interface SuccessResponse<T = any> extends APIResponse<T> {
  success: true;
  data: T;
  error?: never;
}

// Common error response interface
export interface ErrorResponse extends APIResponse<never> {
  success: false;
  data?: never;
  error: APIError;
}

// Request validation error details
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

// Progress update interface (for long-running operations)
export interface ProgressUpdate {
  phase: string;
  progress: number;
  message: string;
  renderedFrames?: number;
  totalFrames?: number;
  estimatedTimeRemaining?: number;
}

// Job/Task status types
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface JobResponse {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Legacy interfaces for backwards compatibility
export interface VideoGenerationRequest {
  type: 'story' | 'reddit' | 'quiz' | 'educational';
  input: {
    text?: string;
    script?: string;
    title?: string;
    config?: any; // Enhanced config from frontend
  };
  settings: {
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    voice?: string;
    background?: string;
    language?: string;
  };
  userId: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  videoId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  outputPath?: string;
  sizeInBytes?: number;
  duration?: number;
  error?: string;
  progress?: number;
}

export interface VideoStatusResponse {
  success: boolean;
  videoId: string;
  status: string;
  progress: number;
  message: string;
  outputPath?: string;
  error?: string;
  sizeInBytes?: number;
  duration?: number;
}

export interface VoiceGenerationRequest {
  script: string;
  selectedVoiceId: string;
  stability?: number;
  similarity?: number;
  ownerId?: string;
}

export interface VoiceGenerationResponse {
  success: boolean;
  audio_url: string;
  audioKey: string;
  voiceId: string;
  filename: string;
  duration?: number;
  settings?: any;
}
