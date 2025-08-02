/**
 * Simplified Cache Routes
 * 
 * Basic cache management without complex R2 video cache
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Get cache status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'simplified',
      message: 'Cache system simplified in Lambda implementation',
      available: false,
      reason: 'Complex caching removed in favor of direct Lambda rendering'
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get cache status'
    });
  }
});

/**
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    simplified: true,
    timestamp: new Date().toISOString()
  });
});

export default router;