import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, JWTPayload } from '../utils/jwt';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';

// Unified authentication middleware - requires valid JWT token
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
};

// Optional authentication - allows both authenticated and unauthenticated access
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Silently continue without user object if token is invalid
    next();
  }
};

// Require authentication - wrapper for better readability
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return authenticateToken(req, res, next);
};

// Legacy plan-based authorization
export const requirePremium = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.plan !== 'premium') {
    return res.status(403).json({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
  }

  next();
};

// Legacy alias for backward compatibility
export const authMiddleware = authenticateToken;

// Type guard to check if user is authenticated
export const isAuthenticated = (req: AuthenticatedRequest): req is AuthenticatedRequest & { user: JWTPayload } => {
  return req.user !== undefined;
};

// User validation helper - ensures user object has required fields
export const validateUser = (user: any): user is JWTPayload => {
  return user &&
         typeof user.id === 'string' &&
         typeof user.userId === 'string' &&
         typeof user.email === 'string' &&
         typeof user.plan === 'string';
};

// Normalize user object from different auth patterns
export const normalizeUser = (user: any): JWTPayload | null => {
  if (!user) return null;

  // Handle JWT payload (already normalized)
  if (validateUser(user)) {
    return user;
  }

  // Handle simple auth user object
  if (user.id && user.email) {
    return {
      id: user.id,
      userId: user.id, // Use id as userId for simple auth
      email: user.email,
      plan: 'free' // Default plan for simple auth
    };
  }

  return null;
};

// Middleware to normalize user objects from different auth patterns
export const normalizeUserMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user) {
    const normalizedUser = normalizeUser(req.user);
    if (normalizedUser) {
      req.user = normalizedUser;
    } else {
      delete req.user;
    }
  }
  next();
};
