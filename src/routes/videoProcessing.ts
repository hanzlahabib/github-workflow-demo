/**
 * Video Processing Routes
 * 
 * Enhanced API endpoints for multi-tier video processing with 
 * intelligent routing, real-time progress, and cost monitoring.
 */

import express from 'express';
import { videoProcessingOrchestrator } from '../services/videoProcessingOrchestrator';
import { videoSizeDetector } from '../services/videoSizeDetector';
import { auth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/video-processing/generate
 * Generate video using intelligent tier routing
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { type, input, settings, options } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    console.log(`[VideoProcessingAPI] Processing request:`, {
      type,
      userId,
      hasConfig: !!input.config,
      priority: options?.priority || 'medium'
    });
    
    // Validate request
    if (!type || !input) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type and input'
      });
    }
    
    // Create processing request
    const processingRequest = {
      type,
      input,
      settings: settings || {},
      userId,
      priority: options?.priority || 'medium',
      options: options || {}
    };
    
    // Check if client wants real-time progress
    const supportsWebSocket = req.headers['x-supports-websocket'] === 'true';
    
    if (supportsWebSocket) {
      // For WebSocket clients, start processing and return immediately
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Start processing asynchronously
      videoProcessingOrchestrator.processVideo(
        { ...processingRequest, videoId },
        (progress) => {
          // Emit progress via WebSocket (implementation depends on your WebSocket setup)
          req.app.get('io')?.to(userId).emit('video_progress', {
            videoId,
            ...progress
          });
        }
      ).then(result => {
        // Emit completion
        req.app.get('io')?.to(userId).emit('video_completed', {
          videoId,
          result
        });
      }).catch(error => {
        // Emit error
        req.app.get('io')?.to(userId).emit('video_error', {
          videoId,
          error: error.message
        });
      });
      
      return res.json({
        success: true,
        videoId,
        message: 'Video processing started. Progress will be sent via WebSocket.',
        estimatedTime: '2-15 minutes depending on complexity'
      });
    } else {
      // For regular HTTP clients, wait for completion
      const result = await videoProcessingOrchestrator.processVideo(processingRequest);
      
      if (result.success) {
        res.json({
          success: true,
          videoUrl: result.videoUrl,
          processingTier: result.processingTier,
          serviceName: result.serviceName,
          performance: result.performance,
          costs: result.costs,
          routing: {
            tier: result.routingDecision.tier.tier,
            service: result.routingDecision.tier.recommendedService,
            reasoning: result.routingDecision.reasoning
          },
          fallback: result.fallback
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          processingTier: result.processingTier,
          performance: result.performance
        });
      }
    }
    
  } catch (error) {
    console.error('[VideoProcessingAPI] Request failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/video-processing/analyze
 * Analyze video requirements and get tier recommendation
 */
router.post('/analyze', auth, async (req, res) => {
  try {
    const { type, input, settings } = req.body;
    
    // Create a temporary request for analysis
    const analysisRequest = {
      type,
      input,
      settings: settings || {},
      userId: req.user?.id || 'anonymous'
    };
    
    // For URL-based videos, we'd analyze the actual file
    // For now, analyze based on request complexity
    const routingDecision = await videoProcessingOrchestrator['determineProcessingTier'](analysisRequest);
    
    res.json({
      success: true,
      recommendation: {
        tier: routingDecision.tier.tier,
        service: routingDecision.tier.recommendedService,
        description: routingDecision.tier.description,
        estimatedTime: routingDecision.tier.estimatedTime,
        estimatedCost: routingDecision.tier.costEstimate,
        confidence: routingDecision.tier.confidence
      },
      analysis: routingDecision.analysis,
      reasoning: routingDecision.reasoning,
      preprocessing: routingDecision.preprocessing,
      fallbackOption: routingDecision.fallbackTier ? {
        tier: routingDecision.fallbackTier.tier,
        service: routingDecision.fallbackTier.recommendedService,
        estimatedCost: routingDecision.fallbackTier.costEstimate
      } : null
    });
    
  } catch (error) {
    console.error('[VideoProcessingAPI] Analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    });
  }
});

/**
 * GET /api/video-processing/status
 * Get current service status and statistics
 */
router.get('/status', auth, async (req, res) => {
  try {
    const [serviceStatus, stats] = await Promise.all([
      videoProcessingOrchestrator.getServiceStatus(),
      Promise.resolve(videoProcessingOrchestrator.getStats())
    ]);
    
    res.json({
      success: true,
      services: serviceStatus,
      statistics: {
        ...stats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      tiers: {
        1: {
          name: 'Small Videos',
          description: 'Standard Lambda processing for videos <50MB',
          typical_time: '30 seconds - 2 minutes',
          cost_range: '$0.01 - $0.05'
        },
        2: {
          name: 'Medium Videos', 
          description: 'Enhanced Lambda for videos 50-150MB',
          typical_time: '2 - 10 minutes',
          cost_range: '$0.05 - $0.25'
        },
        3: {
          name: 'Large Videos',
          description: 'ECS Fargate for videos 150MB+',
          typical_time: '5 - 15 minutes',
          cost_range: '$0.15 - $0.45'
        }
      }
    });
    
  } catch (error) {
    console.error('[VideoProcessingAPI] Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed'
    });
  }
});

/**
 * GET /api/video-processing/costs
 * Get cost breakdown and projections
 */
router.get('/costs', auth, async (req, res) => {
  try {
    const { tier, duration_minutes, file_size_mb } = req.query;
    
    // Calculate cost projections for different tiers
    const costProjections = {
      tier1: {
        name: 'Standard Lambda',
        base_cost: 0.01,
        per_minute: 0.001,
        suitable_for: 'Videos <50MB, <2 minutes processing'
      },
      tier2: {
        name: 'Enhanced Lambda',
        base_cost: 0.05,
        per_minute: 0.005,
        suitable_for: 'Videos 50-150MB, 2-10 minutes processing'
      },
      tier3: {
        name: 'ECS Fargate',
        base_cost: 0.15,
        per_minute: 0.015,
        suitable_for: 'Videos 150MB+, 5-15 minutes processing'
      }
    };
    
    // If specific parameters provided, calculate estimate
    let estimate = null;
    if (tier && duration_minutes) {
      const tierKey = `tier${tier}` as keyof typeof costProjections;
      const tierCost = costProjections[tierKey];
      
      if (tierCost) {
        const durationNum = parseFloat(duration_minutes as string);
        estimate = {
          tier: parseInt(tier as string),
          duration_minutes: durationNum,
          estimated_cost: tierCost.base_cost + (tierCost.per_minute * durationNum),
          breakdown: {
            base_cost: tierCost.base_cost,
            duration_cost: tierCost.per_minute * durationNum,
            total: tierCost.base_cost + (tierCost.per_minute * durationNum)
          }
        };
      }
    }
    
    res.json({
      success: true,
      cost_projections: costProjections,
      estimate,
      notes: [
        'Costs are estimates and may vary based on actual resource usage',
        'Tier 1 has 2-minute Lambda timeout limit',
        'Tier 2 has 10-minute Lambda timeout limit', 
        'Tier 3 has no timeout limit but higher base cost',
        'Preprocessing costs are included in estimates'
      ]
    });
    
  } catch (error) {
    console.error('[VideoProcessingAPI] Cost calculation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Cost calculation failed'
    });
  }
});

/**
 * POST /api/video-processing/quick-size-check
 * Quick file size check for immediate tier recommendation
 */
router.post('/quick-size-check', auth, async (req, res) => {
  try {
    const { video_url } = req.body;
    
    if (!video_url) {
      return res.status(400).json({
        success: false,
        error: 'video_url is required'
      });
    }
    
    // Try to get file size from HTTP headers
    try {
      const response = await fetch(video_url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      if (contentLength) {
        const fileSizeBytes = parseInt(contentLength);
        const fileSizeMB = fileSizeBytes / 1024 / 1024;
        
        let recommendedTier: number;
        let warning: string | null = null;
        
        if (fileSizeMB < 50) {
          recommendedTier = 1;
        } else if (fileSizeMB < 150) {
          recommendedTier = 2;
        } else if (fileSizeMB < 300) {
          recommendedTier = 3;
        } else {
          recommendedTier = 3;
          warning = `Very large file (${fileSizeMB.toFixed(2)}MB). Consider preprocessing or using a smaller video.`;
        }
        
        res.json({
          success: true,
          file_size_mb: fileSizeMB,
          file_size_bytes: fileSizeBytes,
          recommended_tier: recommendedTier,
          tier_name: ['', 'Small', 'Medium', 'Large'][recommendedTier],
          estimated_processing_time: ['', '30s-2min', '2-10min', '5-15min'][recommendedTier],
          estimated_cost: ['', '$0.01-0.05', '$0.05-0.25', '$0.15-0.45'][recommendedTier],
          warning
        });
      } else {
        res.json({
          success: false,
          error: 'Could not determine file size from URL',
          recommendation: 'Use Tier 2 (Medium) as safe default'
        });
      }
    } catch (fetchError) {
      res.json({
        success: false,
        error: 'Could not access video URL',
        details: fetchError instanceof Error ? fetchError.message : String(fetchError),
        recommendation: 'Use Tier 3 (Large) as safest option'
      });
    }
    
  } catch (error) {
    console.error('[VideoProcessingAPI] Quick size check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Size check failed'
    });
  }
});

export default router;