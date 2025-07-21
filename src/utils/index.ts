/**
 * Centralized exports for all utility functions
 * This file provides a single import point for all utility modules
 */

// JWT and Authentication utilities
export * from './jwt';
export * from './password';
export * from './websocket';

// New utility modules
export * from './formatters';
export * from './platform';
export * from './content';
export * from './validation';

// Re-export commonly used types and interfaces
export type {
  JWTPayload,
  AuthRequest
} from './jwt';

export type {
  AuthenticatedSocket,
  WebSocketManager
} from './websocket';

export type {
  PlatformType
} from './platform';

export type {
  ContentTag,
  ViralAnalysisResult
} from './content';

export type {
  ValidationResult
} from './validation';

// Convenience re-exports of most commonly used functions

// Formatting functions
export {
  formatNumber,
  formatEngagementMetrics,
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  formatPercentage,
  formatTimestamp,
  formatCurrency,
  parseViews
} from './formatters';

// Platform functions
export {
  getPlatformOptimalTime,
  getPlatformDemographics,
  getPlatformContentRecommendations,
  getPlatformRiskFactors,
  getPlatformEngagementMultiplier,
  getPlatformHashtags,
  getPlatformVideoDimensions
} from './platform';

// Content functions
export {
  generateContentTags,
  generateHashtags,
  generateRecommendedStrategy,
  generateRiskFactors,
  analyzeViralPotential,
  calculateMonetizationPotential
} from './content';

// Validation functions
export {
  validateEmail,
  validateTextContent,
  validateUrl,
  validateHashtags,
  validateFileUpload,
  validateVideoSettings,
  validateAndSanitizeInput,
  validatePagination
} from './validation';

// JWT functions
export {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader
} from './jwt';

// Password functions
export {
  hashPassword,
  comparePassword,
  validatePassword
} from './password';

// WebSocket functions
export {
  initializeWebSocket,
  getWebSocketManager
} from './websocket';
