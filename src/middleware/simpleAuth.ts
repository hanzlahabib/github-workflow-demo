import { Request, Response, NextFunction } from 'express';

// Define SimpleAuthRequest interface locally since it's only used here
export interface SimpleAuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

// DEPRECATED: This middleware is deprecated and replaced by unified authentication
// @see ./auth.ts for the new unified system

// DEPRECATED: Use optionalAuth + normalizeUserMiddleware instead
// This middleware bypassed real JWT validation and is unsafe for production
export const simpleAuth = (req: SimpleAuthRequest, res: Response, next: NextFunction) => {
  console.warn('DEPRECATED: simpleAuth middleware is deprecated. Use optionalAuth + normalizeUserMiddleware from ./auth.ts instead.');

  // For testing, we'll accept any authorization header or create a test user
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extract token but don't validate for testing
    const token = authHeader.substring(7);
    req.user = {
      id: 'test_user_' + token.substring(0, 8),
      email: 'test@example.com'
    };
  } else {
    // Create a default test user
    req.user = {
      id: 'test_user_default',
      email: 'test@example.com'
    };
  }

  next();
};

export default simpleAuth;
