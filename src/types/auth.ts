// Authentication related types
import { Request } from 'express';

// Standard JWT payload structure
export interface JWTPayload {
  id: string;
  userId: string;
  email: string;
  plan: string;
  iat?: number; // Issued at
  exp?: number; // Expires at
}

// Standard authenticated request interface
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  userLimits?: ResourceLimits; // Added by authorization middleware
}

// Legacy aliases for backward compatibility
export type AuthRequest = AuthenticatedRequest;

// Simple auth interface for testing/mock authentication
export interface SimpleAuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Authentication configuration
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
}

// User plans and authorization
export type UserPlan = 'free' | 'premium' | 'enterprise';
export type UserRole = 'user' | 'premium_user' | 'enterprise_user' | 'admin';

// Resource limits based on plan
export interface ResourceLimits {
  videosPerMonth: number; // -1 for unlimited
  apiCallsPerMinute: number;
}

// Authorization middleware types
export interface AuthorizationOptions {
  plans?: UserPlan[];
  roles?: UserRole[];
  ownership?: boolean;
  admin?: boolean;
}

// Error response types
export interface AuthError {
  error: string;
  code: string;
  requiredPlans?: string[];
  currentPlan?: string;
  requiredRoles?: string[];
  currentRole?: string;
}

// User context for normalized authentication
export interface UserContext {
  id: string;
  userId: string;
  email: string;
  plan: UserPlan;
  role: UserRole;
  limits: ResourceLimits;
}

// Middleware context
export interface MiddlewareContext {
  user?: UserContext;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}
