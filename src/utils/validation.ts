/**
 * Utility functions for input validation and data sanitization
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Invalid email format');
    }

    if (email.length > 254) {
      errors.push('Email is too long (max 254 characters)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate text content for social media
 * @param text - Text to validate
 * @param platform - Target platform (optional)
 * @param maxLength - Custom max length
 * @returns Validation result
 */
export function validateTextContent(text: string, platform?: string, maxLength?: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push('Text content is required');
    return { isValid: false, errors };
  }

  // Platform-specific length limits
  const platformLimits: Record<string, number> = {
    'twitter': 280,
    'instagram': 2200,
    'facebook': 63206,
    'tiktok': 150,
    'youtube': 5000,
    'linkedin': 700
  };

  const limit = maxLength || (platform ? platformLimits[platform.toLowerCase()] : 1000) || 1000;

  if (text.length > limit) {
    errors.push(`Text exceeds ${limit} character limit for ${platform || 'this platform'}`);
  } else if (text.length > limit * 0.9) {
    warnings.push(`Text is close to character limit (${text.length}/${limit})`);
  }

  // Check for minimum length
  if (text.trim().length < 5) {
    errors.push('Text content too short (minimum 5 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @param requireHttps - Whether HTTPS is required
 * @returns Validation result
 */
export function validateUrl(url: string, requireHttps: boolean = false): ValidationResult {
  const errors: string[] = [];

  if (!url || url.trim().length === 0) {
    errors.push('URL is required');
    return { isValid: false, errors };
  }

  try {
    const urlObj = new URL(url);

    if (requireHttps && urlObj.protocol !== 'https:') {
      errors.push('URL must use HTTPS');
    }

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('URL must use HTTP or HTTPS protocol');
    }

  } catch (e) {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate hashtags
 * @param hashtags - Array of hashtags to validate
 * @param platform - Target platform
 * @returns Validation result
 */
export function validateHashtags(hashtags: string[], platform?: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Platform-specific hashtag limits
  const platformLimits: Record<string, number> = {
    'instagram': 30,
    'twitter': 5,
    'tiktok': 10,
    'linkedin': 5,
    'facebook': 10
  };

  const limit = platform ? platformLimits[platform.toLowerCase()] || 10 : 10;

  if (hashtags.length > limit) {
    errors.push(`Too many hashtags for ${platform || 'this platform'} (max ${limit})`);
  } else if (hashtags.length > limit * 0.8) {
    warnings.push(`Using many hashtags (${hashtags.length}/${limit}) - may look spammy`);
  }

  // Validate individual hashtags
  hashtags.forEach((hashtag, index) => {
    if (!hashtag.startsWith('#')) {
      errors.push(`Hashtag ${index + 1} must start with #`);
    } else {
      const tag = hashtag.slice(1);
      if (tag.length === 0) {
        errors.push(`Hashtag ${index + 1} cannot be empty`);
      } else if (tag.length > 100) {
        errors.push(`Hashtag ${index + 1} is too long (max 100 characters)`);
      } else if (!/^[a-zA-Z0-9_]+$/.test(tag)) {
        errors.push(`Hashtag ${index + 1} contains invalid characters (only letters, numbers, and underscores allowed)`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate file upload
 * @param file - File info object
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Validation result
 */
export function validateFileUpload(
  file: { mimetype: string; size: number; originalname: string },
  allowedTypes: string[] = [],
  maxSize: number = 10 * 1024 * 1024 // 10MB default
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(maxSize)}`);
  } else if (file.size > maxSize * 0.8) {
    warnings.push(`Large file size: ${formatFileSize(file.size)}`);
  }

  // Check filename
  if (file.originalname.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }

  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (dangerousExtensions.includes(fileExtension)) {
    errors.push(`File extension ${fileExtension} is not allowed for security reasons`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate video settings
 * @param settings - Video configuration settings
 * @returns Validation result
 */
export function validateVideoSettings(settings: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!settings) {
    errors.push('Video settings are required');
    return { isValid: false, errors };
  }

  // Validate dimensions
  if (settings.width && (settings.width < 100 || settings.width > 4096)) {
    errors.push('Video width must be between 100 and 4096 pixels');
  }

  if (settings.height && (settings.height < 100 || settings.height > 4096)) {
    errors.push('Video height must be between 100 and 4096 pixels');
  }

  // Validate frame rate
  if (settings.fps && (settings.fps < 1 || settings.fps > 120)) {
    errors.push('Frame rate must be between 1 and 120 FPS');
  }

  // Validate duration
  if (settings.duration && (settings.duration < 1 || settings.duration > 3600)) {
    errors.push('Video duration must be between 1 second and 1 hour');
  }

  // Validate quality settings
  if (settings.quality && !['low', 'medium', 'high', 'ultra'].includes(settings.quality)) {
    errors.push('Video quality must be one of: low, medium, high, ultra');
  }

  // Check for performance warnings
  if (settings.width && settings.height && settings.width * settings.height > 1920 * 1080) {
    warnings.push('High resolution video may take longer to process');
  }

  if (settings.fps && settings.fps > 60) {
    warnings.push('High frame rate may increase processing time and file size');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate user input for XSS and other security issues
 * @param input - User input string
 * @param allowHtml - Whether HTML tags are allowed
 * @returns Sanitized input and validation result
 */
export function validateAndSanitizeInput(input: string, allowHtml: boolean = false): {
  sanitized: string;
  validation: ValidationResult;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input) {
    return {
      sanitized: '',
      validation: { isValid: true, errors: [], warnings: [] }
    };
  }

  let sanitized = input;

  // Check for potential XSS
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi
  ];

  let hasXssAttempt = false;
  xssPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      hasXssAttempt = true;
      sanitized = sanitized.replace(pattern, '');
    }
  });

  if (hasXssAttempt) {
    errors.push('Input contains potentially dangerous content that was removed');
  }

  // Remove HTML if not allowed
  if (!allowHtml) {
    const htmlPattern = /<[^>]+>/g;
    if (htmlPattern.test(sanitized)) {
      sanitized = sanitized.replace(htmlPattern, '');
      warnings.push('HTML tags were removed from input');
    }
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  // Check for excessive length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + '...';
    warnings.push('Input was truncated to 10,000 characters');
  }

  return {
    sanitized,
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  };
}

/**
 * Validate pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @param maxLimit - Maximum allowed limit
 * @returns Validated pagination params
 */
export function validatePagination(page: any, limit: any, maxLimit: number = 100): {
  page: number;
  limit: number;
  validation: ValidationResult;
} {
  const errors: string[] = [];

  // Validate and normalize page
  let validatedPage = parseInt(page as string) || 1;
  if (validatedPage < 1) {
    validatedPage = 1;
    errors.push('Page number must be greater than 0');
  }

  // Validate and normalize limit
  let validatedLimit = parseInt(limit as string) || 10;
  if (validatedLimit < 1) {
    validatedLimit = 10;
    errors.push('Limit must be greater than 0');
  } else if (validatedLimit > maxLimit) {
    validatedLimit = maxLimit;
    errors.push(`Limit cannot exceed ${maxLimit}`);
  }

  return {
    page: validatedPage,
    limit: validatedLimit,
    validation: {
      isValid: errors.length === 0,
      errors
    }
  };
}

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + 'KB';
  }
  return bytes + 'B';
}
