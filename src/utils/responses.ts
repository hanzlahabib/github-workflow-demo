/**
 * Standardized Response Utilities
 * Provides consistent API response formatting across all routes
 */

import { Response } from 'express';
import {
  APIResponse,
  APIError,
  ErrorCode,
  HttpStatus,
  SuccessResponse,
  ErrorResponse,
  ResponseMeta,
  PaginationMeta,
  ValidationErrorDetail
} from '../types/api';
import { logger } from './logger';
import { isDevelopment } from '../config';

// Generate request ID if not available
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

// Create response metadata
const createMeta = (requestId?: string): ResponseMeta => ({
  timestamp: new Date().toISOString(),
  requestId: requestId || generateRequestId(),
  version: '1.0'
});

/**
 * Send a successful response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = HttpStatus.OK,
  requestId?: string
): Response<SuccessResponse<T>> => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: createMeta(requestId)
  };

  return res.status(statusCode).json(response);
};

/**
 * Send a successful response with pagination
 */
export const sendSuccessWithPagination = <T>(
  res: Response,
  data: T,
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  statusCode: number = HttpStatus.OK,
  requestId?: string
): Response<APIResponse<T>> => {
  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      ...createMeta(requestId),
      pagination: {
        ...pagination,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1
      }
    } as PaginationMeta
  };

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  error: APIError,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  requestId?: string
): Response<ErrorResponse> => {
  const response: ErrorResponse = {
    success: false,
    error,
    meta: createMeta(requestId)
  };

  // Log the error for monitoring
  logger.error('API Error Response', {
    requestId,
    statusCode,
    errorCode: error.code,
    errorMessage: error.message,
    errorDetails: error.details
  });

  return res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 */
export const sendValidationError = (
  res: Response,
  message: string,
  details: ValidationErrorDetail[] | string,
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code: ErrorCode.VALIDATION_ERROR,
    details: Array.isArray(details) ? details : { validation: details }
  };

  return sendError(res, error, HttpStatus.BAD_REQUEST, requestId);
};

/**
 * Send a not found error response
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found',
  code: ErrorCode = ErrorCode.NOT_FOUND,
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code
  };

  return sendError(res, error, HttpStatus.NOT_FOUND, requestId);
};

/**
 * Send an unauthorized error response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized access',
  code: ErrorCode = ErrorCode.UNAUTHORIZED,
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code
  };

  return sendError(res, error, HttpStatus.UNAUTHORIZED, requestId);
};

/**
 * Send a forbidden error response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden access',
  code: ErrorCode = ErrorCode.FORBIDDEN,
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code
  };

  return sendError(res, error, HttpStatus.FORBIDDEN, requestId);
};

/**
 * Send a conflict error response
 */
export const sendConflict = (
  res: Response,
  message: string = 'Resource conflict',
  code: ErrorCode = ErrorCode.CONFLICT,
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code
  };

  return sendError(res, error, HttpStatus.CONFLICT, requestId);
};

/**
 * Send a bad request error response
 */
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request',
  code: ErrorCode = ErrorCode.INVALID_REQUEST,
  details?: any,
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code,
    details
  };

  return sendError(res, error, HttpStatus.BAD_REQUEST, requestId);
};

/**
 * Send an internal server error response
 */
export const sendInternalError = (
  res: Response,
  message: string = 'Internal server error',
  error?: Error,
  requestId?: string
): Response<ErrorResponse> => {
  const apiError: APIError = {
    message,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    details: isDevelopment() && error ? {
      stack: error.stack,
      name: error.name
    } : undefined
  };

  // Log the error with full details
  if (error) {
    logger.error('Internal Server Error', {
      requestId,
      error,
      message: error.message,
      stack: error.stack
    });
  }

  return sendError(res, apiError, HttpStatus.INTERNAL_SERVER_ERROR, requestId);
};

/**
 * Send a service unavailable error response
 */
export const sendServiceUnavailable = (
  res: Response,
  message: string = 'Service temporarily unavailable',
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code: ErrorCode.SERVICE_UNAVAILABLE
  };

  return sendError(res, error, HttpStatus.SERVICE_UNAVAILABLE, requestId);
};

/**
 * Send a rate limit error response
 */
export const sendRateLimit = (
  res: Response,
  message: string = 'Rate limit exceeded',
  requestId?: string
): Response<ErrorResponse> => {
  const error: APIError = {
    message,
    code: ErrorCode.LIMIT_REACHED
  };

  return sendError(res, error, HttpStatus.TOO_MANY_REQUESTS, requestId);
};

/**
 * Create a standardized error object
 */
export const createError = (
  message: string,
  code: ErrorCode,
  details?: any,
  field?: string
): APIError => ({
  message,
  code,
  details,
  field
});

/**
 * Helper function to extract request ID from Express request
 */
export const getRequestId = (req: any): string => {
  return req.requestId || req.headers['x-request-id'] || generateRequestId();
};

// Backward compatibility helpers for existing patterns
export const legacyResponse = {
  /**
   * Convert existing error pattern to new format
   */
  convertError: (
    res: Response,
    errorObj: { error: string; code?: string; details?: any },
    statusCode: number = 500,
    requestId?: string
  ) => {
    const apiError: APIError = {
      message: errorObj.error,
      code: errorObj.code || ErrorCode.INTERNAL_SERVER_ERROR,
      details: errorObj.details
    };
    return sendError(res, apiError, statusCode, requestId);
  },

  /**
   * Convert existing success pattern to new format
   */
  convertSuccess: <T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    requestId?: string
  ) => {
    return sendSuccess(res, data, statusCode, requestId);
  }
};

// Common response patterns for specific business logic
export const authResponses = {
  loginSuccess: (res: Response, user: any, tokens: any, requestId?: string) =>
    sendSuccess(res, { user, tokens }, HttpStatus.OK, requestId),

  registerSuccess: (res: Response, user: any, tokens: any, requestId?: string) =>
    sendSuccess(res, { user, tokens }, HttpStatus.CREATED, requestId),

  tokenRefreshSuccess: (res: Response, tokens: any, requestId?: string) =>
    sendSuccess(res, { tokens }, HttpStatus.OK, requestId),

  invalidCredentials: (res: Response, requestId?: string) =>
    sendUnauthorized(res, 'Invalid credentials', ErrorCode.INVALID_CREDENTIALS, requestId),

  userExists: (res: Response, requestId?: string) =>
    sendConflict(res, 'User already exists', ErrorCode.USER_EXISTS, requestId),

  userNotFound: (res: Response, requestId?: string) =>
    sendNotFound(res, 'User not found', ErrorCode.USER_NOT_FOUND, requestId)
};

export const videoResponses = {
  generationStarted: (res: Response, video: any, jobId: string, requestId?: string) =>
    sendSuccess(res, { video, jobId }, HttpStatus.CREATED, requestId),

  videoNotFound: (res: Response, requestId?: string) =>
    sendNotFound(res, 'Video not found', ErrorCode.VIDEO_NOT_FOUND, requestId),

  limitReached: (res: Response, requestId?: string) =>
    sendForbidden(res, 'Monthly video limit reached. Upgrade to premium for unlimited videos.', ErrorCode.LIMIT_REACHED, requestId),

  invalidStatus: (res: Response, message: string, requestId?: string) =>
    sendBadRequest(res, message, ErrorCode.INVALID_STATUS, undefined, requestId)
};
