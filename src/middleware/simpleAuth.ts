import { Request, Response, NextFunction } from 'express';

export interface SimpleAuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

// Simple auth middleware for testing - bypasses real JWT validation
export const simpleAuth = (req: SimpleAuthRequest, res: Response, next: NextFunction) => {
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