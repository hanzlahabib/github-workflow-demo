import { Response, NextFunction } from 'express';
import { AuthRequest, verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
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

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }
    
    next();
  } catch (error) {
    next();
  }
};

export const requirePremium = (req: AuthRequest, res: Response, next: NextFunction) => {
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