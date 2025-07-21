/**
 * Express App Integration for Centralized Error Handling
 * Use this to easily integrate the error handling system into any Express app
 */

import { Express } from 'express';
import {
  globalErrorHandler,
  notFoundHandler,
  securityErrorHandler
} from './errorHandler';
import { requestLogger } from '../utils/logger';

/**
 * Integrate centralized error handling into an Express app
 * Call this function after all routes are defined
 */
export const integrateErrorHandling = (app: Express): void => {
  // Add request logging middleware first (if not already added)
  app.use(requestLogger);

  // Add 404 handler for undefined routes
  app.use(notFoundHandler);

  // Add security error handler (handles CORS, rate limiting, etc.)
  app.use(securityErrorHandler);

  // Add global error handler (must be last)
  app.use(globalErrorHandler);
};

/**
 * Example integration for existing Express apps
 *
 * Basic usage:
 * ```typescript
 * import express from 'express';
 * import { integrateErrorHandling } from './middleware/integration';
 *
 * const app = express();
 *
 * // Your middleware
 * app.use(express.json());
 *
 * // Your routes
 * app.use('/api/auth', authRoutes);
 * app.use('/api/videos', videoRoutes);
 *
 * // Integrate error handling (must be last)
 * integrateErrorHandling(app);
 *
 * app.listen(3000);
 * ```
 *
 * Advanced usage with custom logging:
 * ```typescript
 * import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
 * import { logger, requestLogger } from './utils/logger';
 *
 * // Add request logging
 * app.use(requestLogger);
 *
 * // Your routes here...
 *
 * // Custom 404 handler
 * app.use(notFoundHandler);
 *
 * // Global error handler
 * app.use(globalErrorHandler);
 * ```
 */

/**
 * Minimal integration for simple apps
 * Just adds the essential error handling without request logging
 */
export const integrateMinimalErrorHandling = (app: Express): void => {
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
};

export default integrateErrorHandling;
