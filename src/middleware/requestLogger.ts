import { Request, Response, NextFunction } from 'express';

export interface RequestLog {
  method: string;
  url: string;
  headers: any;
  body: any;
  timestamp: string;
  requestId: string;
}

export interface ResponseLog {
  statusCode: number;
  headers: any;
  body: any;
  timestamp: string;
  requestId: string;
  duration: number;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  // Add requestId to request object for use in routes
  (req as any).requestId = requestId;

  // Only log video-related requests in detail
  const isVideoRequest = req.url.includes('/video');

  if (isVideoRequest) {
    console.log(`[Request][${requestId}] ${req.method} ${req.url}`);
  }

  // Intercept response
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(body: any) {
    if (isVideoRequest) {
      const duration = Date.now() - startTime;
      console.log(`[Response][${requestId}] ${res.statusCode} (${duration}ms)`);
    }
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    if (isVideoRequest) {
      const duration = Date.now() - startTime;
      console.log(`[Response][${requestId}] ${res.statusCode} (${duration}ms)`);
    }
    return originalJson.call(this, body);
  };

  next();
};