/**
 * Test script for the centralized error handling system
 * Run with: npx ts-node src/test-error-handling.ts
 */

import express from 'express';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendNotFound,
  sendUnauthorized,
  authResponses,
  videoResponses
} from './utils/responses';
import { ErrorCode } from './types/api';
import {
  asyncHandler,
  businessErrorHandlers,
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError
} from './middleware/errorHandler';
import { logger, requestLogger } from './utils/logger';
import { integrateErrorHandling } from './middleware/integration';

const app = express();

// Basic middleware
app.use(express.json());

// Add request logging
app.use(requestLogger);

console.log('🧪 Testing Centralized Error Handling System');

// Test routes demonstrating different error patterns
app.get('/test/success', asyncHandler(async (req, res) => {
  logger.info('Testing success response');
  return sendSuccess(res, { message: 'Success!', timestamp: new Date() });
}));

app.get('/test/validation-error', asyncHandler(async (req, res) => {
  logger.info('Testing validation error');
  throw businessErrorHandlers.missingFields(['email', 'password']);
}));

app.get('/test/not-found', asyncHandler(async (req, res) => {
  logger.info('Testing not found error');
  throw businessErrorHandlers.userNotFound();
}));

app.get('/test/custom-error', asyncHandler(async (req, res) => {
  logger.info('Testing custom error');
  throw new AppError('This is a custom application error', 400, ErrorCode.INVALID_REQUEST);
}));

app.get('/test/business-logic', asyncHandler(async (req, res) => {
  logger.info('Testing business logic error');
  throw businessErrorHandlers.limitReached('Daily API limit exceeded');
}));

app.get('/test/auth-responses', asyncHandler(async (req, res) => {
  logger.info('Testing auth response helpers');
  const userData = {
    id: '123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };
  const tokens = { accessToken: 'fake-token', refreshToken: 'fake-refresh' };
  return authResponses.loginSuccess(res, userData, tokens);
}));

app.get('/test/video-responses', asyncHandler(async (req, res) => {
  logger.info('Testing video response helpers');
  const videoData = {
    id: 'video-123',
    title: 'Test Video',
    status: 'processing'
  };
  return videoResponses.generationStarted(res, videoData, 'job-123');
}));

app.get('/test/unexpected-error', asyncHandler(async (req, res) => {
  logger.info('Testing unexpected error handling');
  // This will cause a ReferenceError
  const nonExistentVariable: any = undefined;
  const result = nonExistentVariable.someProperty;
  return sendSuccess(res, result);
}));

app.get('/test/database-error', asyncHandler(async (req, res) => {
  logger.info('Testing database error simulation');
  // Simulate MongoDB validation error
  const error = new Error('Validation failed') as any;
  error.name = 'ValidationError';
  error.errors = {
    email: {
      path: 'email',
      message: 'Email is required',
      value: undefined
    }
  };
  throw error;
}));

app.get('/test/conflict', asyncHandler(async (req, res) => {
  logger.info('Testing conflict error');
  throw new ConflictError('User already exists', ErrorCode.USER_EXISTS);
}));

// Integrate error handling (must be after all routes)
integrateErrorHandling(app);

// Test function to make requests to our test endpoints
async function runTests() {
  const PORT = 3001; // Use a different port to avoid conflicts

  const server = app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);

    // Test endpoints with different error scenarios
    const testEndpoints = [
      '/test/success',
      '/test/validation-error',
      '/test/not-found',
      '/test/custom-error',
      '/test/business-logic',
      '/test/auth-responses',
      '/test/video-responses',
      '/test/unexpected-error',
      '/test/database-error',
      '/test/conflict',
      '/test/nonexistent-route' // This will trigger 404 handler
    ];

    console.log('\n📊 Testing Error Response Formats:');
    console.log('=====================================');

    testEndpoints.forEach((endpoint, index) => {
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}${endpoint}`);
          const data = await response.json();

          console.log(`\n${index + 1}. ${endpoint} (${response.status}):`);
          console.log(JSON.stringify(data, null, 2));

          // If this is the last test, close the server
          if (index === testEndpoints.length - 1) {
            setTimeout(() => {
              server.close();
              console.log('\n✅ All tests completed!');
              console.log('\n🎯 Key Features Demonstrated:');
              console.log('- Consistent API response format');
              console.log('- Standardized error codes');
              console.log('- Structured logging');
              console.log('- Request tracking');
              console.log('- Business logic error handling');
              console.log('- Automatic error type detection');
              console.log('- Response helper utilities');
            }, 1000);
          }
        } catch (error) {
          console.error(`Error testing ${endpoint}:`, error);
        }
      }, index * 500); // Stagger requests
    });
  });
}

// Only run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { app };
