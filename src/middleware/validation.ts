/**
 * Simple request validation middleware
 */

import { Request, Response, NextFunction } from 'express';

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  // Basic request validation
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is required' });
  }
  
  next();
}