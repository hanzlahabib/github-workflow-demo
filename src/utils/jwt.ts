import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { getAuthConfig } from '../config/centralized';

// Lazy load auth configuration
const getAuthConfigLazy = () => {
  try {
    return getAuthConfig();
  } catch (error) {
    // Fallback to environment variables if centralized config not initialized
    return {
      jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
      jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    };
  }
};

export interface JWTPayload {
  id: string;
  userId: string;
  email: string;
  plan: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// Legacy alias for backward compatibility
export type AuthRequest = AuthenticatedRequest;

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (payload: JWTPayload) => {
  const authConfig = getAuthConfigLazy();
  const accessExpiry = (authConfig as any).jwtAccessExpiresIn || (authConfig as any).jwtExpiresIn;

  const accessToken = jwt.sign(payload as any, authConfig.jwtSecret, {
    expiresIn: accessExpiry,
  } as any);

  const refreshToken = jwt.sign(payload as any, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtRefreshExpiresIn,
  } as any);

  return { accessToken, refreshToken } as TokenResponse;
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const authConfig = getAuthConfigLazy();
    return jwt.verify(token, authConfig.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const authConfig = getAuthConfigLazy();
    return jwt.verify(token, authConfig.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};
