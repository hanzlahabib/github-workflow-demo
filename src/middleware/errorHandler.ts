/**
 * Centralized Error Handling Middleware
 * Handles all errors consistently across the application
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorCode, HttpStatus } from '../types/api';
import { sendError, sendInternalError, getRequestId } from '../utils/responses';
import { logger } from '../utils/logger';
import { isDevelopment } from '../config';

// Custom application errors
export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, details);
  }
}

// Authentication error class
export class AuthError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    statusCode: number = HttpStatus.UNAUTHORIZED
  ) {
    super(message, statusCode, code);
  }
}

// Not found error class
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: ErrorCode = ErrorCode.NOT_FOUND) {
    super(message, HttpStatus.NOT_FOUND, code);
  }
}

// Conflict error class
export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.CONFLICT) {
    super(message, HttpStatus.CONFLICT, code);
  }
}

// Rate limit error class
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCode.LIMIT_REACHED);
  }
}

// External service error class
export class ServiceError extends AppError {
  constructor(message: string, serviceName?: string) {
    super(
      `${serviceName ? `${serviceName}: ` : ''}${message}`,
      HttpStatus.BAD_GATEWAY,
      ErrorCode.EXTERNAL_SERVICE_ERROR
    );
  }
}

// Handle different types of errors and convert them to standardized format
const handleError = (error: any, req: Request): { statusCode: number; apiError: any } => {
  const requestId = getRequestId(req);

  // Handle known application errors
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      apiError: {
        message: error.message,
        code: error.code,
        details: error.details
      }
    };
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      apiError: {
        message: 'Invalid token',
        code: ErrorCode.INVALID_TOKEN
      }
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      apiError: {
        message: 'Token expired',
        code: ErrorCode.TOKEN_EXPIRED
      }
    };
  }

  // Handle MongoDB validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      apiError: {
        message: 'Validation failed',
        code: ErrorCode.VALIDATION_ERROR,
        details: validationErrors
      }
    };
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return {
      statusCode: HttpStatus.CONFLICT,
      apiError: {
        message: `${field} already exists`,
        code: ErrorCode.DUPLICATE_RESOURCE,
        field
      }
    };
  }

  // Handle MongoDB cast errors
  if (error.name === 'CastError') {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      apiError: {
        message: 'Invalid ID format',
        code: ErrorCode.INVALID_REQUEST,
        field: error.path
      }
    };
  }

  // Handle Multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      apiError: {
        message: 'File size too large',
        code: ErrorCode.VALIDATION_ERROR
      }
    };
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      apiError: {
        message: 'Unexpected file field',
        code: ErrorCode.VALIDATION_ERROR
      }
    };
  }

  // Handle syntax errors (invalid JSON)
  if (error instanceof SyntaxError && 'body' in error) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      apiError: {
        message: 'Invalid JSON format',
        code: ErrorCode.INVALID_REQUEST
      }
    };
  }

  // Handle network/timeout errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return {
      statusCode: HttpStatus.BAD_GATEWAY,
      apiError: {
        message: 'External service unavailable',
        code: ErrorCode.SERVICE_UNAVAILABLE
      }
    };
  }

  // Default to internal server error for unknown errors
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    apiError: {
      message: 'Internal server error',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      details: isDevelopment() ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }
  };
};

// Global error handling middleware
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = getRequestId(req);

  // Log the error
  logger.error('Unhandled Error', {
    requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId || (req as any).user?.id,
    error,
    stack: error.stack
  });

  // Handle the error and send appropriate response
  const { statusCode, apiError } = handleError(error, req);

  return sendError(res, apiError, statusCode, requestId);
};

// Async error wrapper - catches errors from async route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): Response => {
  const requestId = getRequestId(req);

  logger.warn('Route Not Found', {
    requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  return sendError(res, {
    message: `Route ${req.method} ${req.url} not found`,
    code: ErrorCode.NOT_FOUND
  }, HttpStatus.NOT_FOUND, requestId);
};

// Security error handler
export const securityErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = getRequestId(req);

  // Log security-related errors separately
  logger.securityEvent('Security Error', {
    requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: error.message
  });

  // Handle CORS errors
  if (error.message && error.message.includes('CORS')) {
    return sendError(res, {
      message: 'Cross-origin request blocked',
      code: ErrorCode.FORBIDDEN
    }, HttpStatus.FORBIDDEN, requestId);
  }

  // Handle rate limiting errors
  if (error.status === 429) {
    return sendError(res, {
      message: 'Too many requests',
      code: ErrorCode.LIMIT_REACHED
    }, HttpStatus.TOO_MANY_REQUESTS, requestId);
  }

  // Continue with normal error handling
  return next(error);
};

// Validation middleware helper
export const validateRequest = (validationRules: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run all validation rules
      await Promise.all(validationRules.map(validation => validation.run(req)));

      // Check for validation errors
      const errors = []; // This would normally use express-validator results

      if (errors.length > 0) {
        throw new ValidationError('Request validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to create standardized errors
export const createAppError = (
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
  details?: any
): AppError => {
  return new AppError(message, statusCode, code, details);
};

// Business logic error handlers
export const businessErrorHandlers = {
  userNotFound: () => new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND),
  videoNotFound: () => new NotFoundError('Video not found', ErrorCode.VIDEO_NOT_FOUND),
  voiceNotFound: () => new NotFoundError('Voice not found', ErrorCode.VOICE_NOT_FOUND),
  unauthorized: (message = 'Unauthorized access') => new AuthError(message, ErrorCode.UNAUTHORIZED),
  forbidden: (message = 'Forbidden access') => new AuthError(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN),
  invalidCredentials: () => new AuthError('Invalid credentials', ErrorCode.INVALID_CREDENTIALS),
  userExists: () => new ConflictError('User already exists', ErrorCode.USER_EXISTS),
  limitReached: (message = 'Limit reached') => new RateLimitError(message),
  invalidStatus: (message = 'Invalid status') => new ValidationError(message),
  missingFields: (fields: string[]) => new ValidationError(`Missing required fields: ${fields.join(', ')}`),
  invalidPassword: (details?: any) => new ValidationError('Invalid password', details),
  serviceUnavailable: (service: string) => new ServiceError('Service unavailable', service)
};
