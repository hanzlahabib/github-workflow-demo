// External dependencies
import express, { Response } from 'express';

// Types
import { AuthenticatedRequest } from '../utils/jwt';

// Models
import { User } from '../models';

// Middleware
import { authenticateToken } from '../middleware/auth';

// Utils
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';

// Centralized error handling and responses
import { sendSuccess, sendBadRequest, sendConflict, sendUnauthorized, sendNotFound, sendInternalError, getRequestId, authResponses } from '../utils/responses';
import { ErrorCode } from '../types/api';
import { asyncHandler, businessErrorHandlers } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Register new user
router.post('/register', asyncHandler(async (req, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    throw businessErrorHandlers.missingFields(['email', 'password', 'firstName', 'lastName']);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendBadRequest(res, 'Invalid email format', ErrorCode.INVALID_EMAIL, undefined, getRequestId(req));
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw businessErrorHandlers.invalidPassword(passwordValidation.errors);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw businessErrorHandlers.userExists();
  }

  const hashedPassword = await hashPassword(password);

  const user = new User({
    email: email.toLowerCase(),
    password: hashedPassword,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  });

  await user.save();

  const tokens = generateTokens({
    id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    plan: user.plan
  });

  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    plan: user.plan,
    points: user.points,
    badges: user.badges
  };

  logger.authEvent('User registered', user._id.toString(), {
    requestId: getRequestId(req),
    email: user.email,
    plan: user.plan
  });

  return authResponses.registerSuccess(res, userData, tokens, getRequestId(req));
}));

// Login user
router.post('/login', asyncHandler(async (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw businessErrorHandlers.missingFields(['email', 'password']);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw businessErrorHandlers.invalidCredentials();
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw businessErrorHandlers.invalidCredentials();
  }

  user.lastLogin = new Date();
  await user.save();

  const tokens = generateTokens({
    id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    plan: user.plan
  });

  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    plan: user.plan,
    points: user.points,
    badges: user.badges,
    videosCreated: user.videosCreated
  };

  logger.authEvent('User logged in', user._id.toString(), {
    requestId: getRequestId(req),
    email: user.email,
    lastLogin: user.lastLogin
  });

  return authResponses.loginSuccess(res, userData, tokens, getRequestId(req));
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw businessErrorHandlers.missingFields(['refreshToken']);
  }

  const payload = verifyRefreshToken(refreshToken);

  const user = await User.findById(payload.userId);
  if (!user) {
    throw businessErrorHandlers.userNotFound();
  }

  const tokens = generateTokens({
    id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    plan: user.plan
  });

  logger.authEvent('Token refreshed', user._id.toString(), {
    requestId: getRequestId(req)
  });

  return authResponses.tokenRefreshSuccess(res, tokens, getRequestId(req));
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await User.findById(req.user!.userId).select('-password');
  if (!user) {
    throw businessErrorHandlers.userNotFound();
  }

  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    plan: user.plan,
    points: user.points,
    badges: user.badges,
    videosCreated: user.videosCreated,
    preferences: user.preferences,
    subscription: user.subscription,
    createdAt: user.createdAt
  };

  return sendSuccess(res, { user: userData }, 200, getRequestId(req));
}));

// Update user profile
router.patch('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { firstName, lastName, preferences } = req.body;

  const updateData: any = {};
  if (firstName) updateData.firstName = firstName.trim();
  if (lastName) updateData.lastName = lastName.trim();
  if (preferences) updateData.preferences = preferences;

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw businessErrorHandlers.userNotFound();
  }

  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    plan: user.plan,
    points: user.points,
    badges: user.badges,
    videosCreated: user.videosCreated,
    preferences: user.preferences
  };

  logger.info('User profile updated', {
    requestId: getRequestId(req),
    userId: user._id.toString()
  });

  return sendSuccess(res, { user: userData }, 200, getRequestId(req));
}));

export default router;
