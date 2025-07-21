// Common types used across the application

export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseModel {
  email: string;
  passwordHash: string;
  plan: 'free' | 'premium' | 'pro';
  name?: string;
  avatar?: string;
  preferences?: Record<string, any>;
}

export interface Video extends BaseModel {
  title: string;
  description?: string;
  type: 'story' | 'reddit' | 'quiz' | 'educational';
  status: 'processing' | 'completed' | 'failed';
  userId: string;
  settings: Record<string, any>;
  outputPath?: string;
  thumbnailPath?: string;
  duration?: number;
  sizeInBytes?: number;
  metadata?: Record<string, any>;
}

export interface Job extends BaseModel {
  type: 'video_generation' | 'voice_generation' | 'image_generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  progress: number;
  error?: string;
  attempts: number;
  maxAttempts: number;
}

export interface Template extends BaseModel {
  name: string;
  description?: string;
  type: 'story' | 'reddit' | 'quiz' | 'educational';
  config: Record<string, any>;
  isPublic: boolean;
  userId: string;
  tags?: string[];
  thumbnail?: string;
}

export interface Caption extends BaseModel {
  text: string;
  startTime: number;
  endTime: number;
  videoId: string;
  style?: Record<string, any>;
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Configuration types
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL?: string;
  REDIS_URL?: string;
}

export interface ServiceConfig {
  backend: {
    port: number;
    cors: string | string[];
    rateLimit?: {
      windowMs: number;
      max: number;
    };
  };
  ai: {
    openai: {
      apiKey: string;
      organization?: string;
    };
    elevenlabs: {
      apiKey: string;
    };
  };
  storage: {
    provider: 'local' | 'aws' | 'cloudflare';
    aws?: S3Config;
    cloudflare?: {
      endpoint: string;
      accessKey: string;
      secretKey: string;
      bucket: string;
    };
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshSecret: string;
    jwtRefreshExpiresIn: string;
  };
}

import type { S3Config } from './services';
