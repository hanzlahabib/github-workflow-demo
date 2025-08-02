/**
 * Lambda Video Processing Routes
 * 
 * Clean API routes matching Clippie's implementation:
 * - POST /api/lambda/render - Start video render
 * - POST /api/lambda/progress - Get render progress
 * - DELETE /api/lambda/render/:id - Cancel render
 */

import { Router, Request, Response } from 'express';
import { simpleLambdaService } from '../services/simpleLambdaService';
import { validateRequest } from '../middleware/validation';

const router = Router();

/**
 * Start Lambda render - matches Clippie's /api/lambda/render
 */
router.post('/render', validateRequest, async (req: Request, res: Response) => {
  try {
    const {
      id = 'demo',
      inputProps,
      fileName = 'Untitled video.mp4',
      key,
      videoId
    } = req.body;

    // Validate required fields
    if (!inputProps) {
      return res.status(400).json({
        error: 'inputProps is required'
      });
    }

    console.log(`[Lambda API] Starting render for videoId: ${videoId || id}`);

    // Start render using simplified service
    const result = await simpleLambdaService.startRender({
      id,
      inputProps,
      fileName,
      key: key || `renders/${id}.mp4`,
      videoId: videoId || id
    });

    console.log(`[Lambda API] Render started: ${result.renderId}`);

    // Return Clippie-compatible response
    res.json(result);

  } catch (error) {
    console.error('[Lambda API] Render failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start render'
    });
  }
});

/**
 * Get render progress - matches Clippie's /api/lambda/progress
 */
router.post('/progress', async (req: Request, res: Response) => {
  try {
    const { id, bucketName } = req.body;

    // Validate required fields
    if (!id || !bucketName) {
      return res.status(400).json({
        error: 'id and bucketName are required'
      });
    }

    console.log(`[Lambda API] Checking progress for render: ${id}`);

    // Get progress using simplified service
    const progress = await simpleLambdaService.getRenderProgress({
      id,
      bucketName
    });

    console.log(`[Lambda API] Progress for ${id}:`, progress);

    // Return Clippie-compatible response
    res.json(progress);

  } catch (error) {
    console.error('[Lambda API] Progress check failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get progress'
    });
  }
});

/**
 * Cancel render
 */
router.delete('/render/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bucketName } = req.body;

    if (!bucketName) {
      return res.status(400).json({
        error: 'bucketName is required'
      });
    }

    console.log(`[Lambda API] Cancelling render: ${id}`);

    const result = await simpleLambdaService.cancelRender(id, bucketName);

    res.json(result);

  } catch (error) {
    console.error('[Lambda API] Cancel failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to cancel render'
    });
  }
});

/**
 * Get Lambda service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = simpleLambdaService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[Lambda API] Status check failed:', error);
    res.status(500).json({
      error: 'Failed to get status'
    });
  }
});

/**
 * Test render endpoint for development
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    console.log('[Lambda API] Starting test render...');

    // Test with minimal input
    const testRequest = {
      id: `test-${Date.now()}`,
      inputProps: {
        conversations: [{
          id: '1',
          name: 'Test Conversation',
          messages: [{
            id: '1',
            text: 'Hello, this is a test message',
            from: 'sender',
            voiceId: 'default',
            duration: 1
          }],
          processedMessages: []
        }],
        messageMetadata: {
          username: 'Test User',
          pfp: '',
          darkMode: false,
          unreadMessages: '0',
          ui: 'iOS Dark'
        },
        durationInSeconds: 10,
        durationProp: 10
      },
      fileName: 'test-video.mp4',
      key: `test-renders/test-${Date.now()}.mp4`,
      videoId: `test-${Date.now()}`
    };

    // Start render
    const renderResult = await simpleLambdaService.startRender(testRequest);
    
    // Poll for completion (simplified for testing)
    let attempts = 0;
    const maxAttempts = 30; // 1 minute max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const progress = await simpleLambdaService.getRenderProgress({
        id: renderResult.renderId,
        bucketName: renderResult.bucketName
      });
      
      if (progress.type === 'done') {
        return res.json({
          success: true,
          message: 'Test render completed successfully',
          videoUrl: progress.url,
          renderTime: attempts * 2,
          renderResult,
          finalProgress: progress
        });
      }
      
      attempts++;
    }
    
    // Timeout
    res.json({
      success: false,
      message: 'Test render timed out',
      renderResult,
      attempts
    });

  } catch (error) {
    console.error('[Lambda API] Test render failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Test render failed'
    });
  }
});

export default router;