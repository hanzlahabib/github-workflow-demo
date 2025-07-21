/**
 * Centralized Logging System
 * Provides structured logging with different levels and context
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  DEBUG = 4
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  stack?: string;
}

class Logger {
  private level: LogLevel;
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.level = this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'HTTP': return LogLevel.HTTP;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return this.environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatLog(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      stack: context.error?.stack
    };
  }

  private output(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const prefix = `[${entry.timestamp}] ${levelName}:`;

    if (this.environment === 'production') {
      // In production, output JSON for log aggregation
      console.log(JSON.stringify(entry));
    } else {
      // In development, human-readable format
      const contextStr = Object.keys(entry.context).length > 0
        ? ` ${JSON.stringify(entry.context, null, 2)}`
        : '';

      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(`${prefix} ${entry.message}${contextStr}`);
          if (entry.stack) console.error(entry.stack);
          break;
        case LogLevel.WARN:
          console.warn(`${prefix} ${entry.message}${contextStr}`);
          break;
        case LogLevel.HTTP:
          console.info(`${prefix} ${entry.message}${contextStr}`);
          break;
        case LogLevel.DEBUG:
          console.debug(`${prefix} ${entry.message}${contextStr}`);
          break;
        default:
          console.log(`${prefix} ${entry.message}${contextStr}`);
      }
    }
  }

  error(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.formatLog(LogLevel.ERROR, message, context);
    this.output(entry);
  }

  warn(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.formatLog(LogLevel.WARN, message, context);
    this.output(entry);
  }

  info(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.formatLog(LogLevel.INFO, message, context);
    this.output(entry);
  }

  http(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.HTTP)) return;

    const entry = this.formatLog(LogLevel.HTTP, message, context);
    this.output(entry);
  }

  debug(message: string, context: LogContext = {}): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.formatLog(LogLevel.DEBUG, message, context);
    this.output(entry);
  }

  // Convenience methods for common use cases
  apiRequest(method: string, url: string, statusCode: number, duration: number, context: LogContext = {}): void {
    this.http('API Request', {
      ...context,
      method,
      url,
      statusCode,
      duration
    });
  }

  apiError(message: string, error: Error, context: LogContext = {}): void {
    this.error(message, {
      ...context,
      error,
      errorMessage: error.message,
      errorName: error.name
    });
  }

  authEvent(event: string, userId?: string, context: LogContext = {}): void {
    this.info(`Auth Event: ${event}`, {
      ...context,
      userId,
      event
    });
  }

  businessEvent(event: string, context: LogContext = {}): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      event
    });
  }

  securityEvent(event: string, context: LogContext = {}): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      event,
      security: true
    });
  }

  performanceEvent(operation: string, duration: number, context: LogContext = {}): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      performance: true
    });
  }
}

// Create and export a singleton logger instance
export const logger = new Logger();

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Add request ID to request object for use in other middleware/routes
  req.requestId = requestId;

  // Log request start
  logger.http('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;

    // Log request completion
    logger.apiRequest(req.method, req.url, res.statusCode, duration, {
      requestId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || req.user?.id,
      responseSize: JSON.stringify(body).length
    });

    return originalJson.call(this, body);
  };

  next();
};

// Utility function to create child logger with common context
export const createContextLogger = (context: LogContext) => {
  return {
    error: (message: string, additionalContext: LogContext = {}) =>
      logger.error(message, { ...context, ...additionalContext }),
    warn: (message: string, additionalContext: LogContext = {}) =>
      logger.warn(message, { ...context, ...additionalContext }),
    info: (message: string, additionalContext: LogContext = {}) =>
      logger.info(message, { ...context, ...additionalContext }),
    debug: (message: string, additionalContext: LogContext = {}) =>
      logger.debug(message, { ...context, ...additionalContext }),
    http: (message: string, additionalContext: LogContext = {}) =>
      logger.http(message, { ...context, ...additionalContext })
  };
};
