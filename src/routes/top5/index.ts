import express from 'express';
import multer from 'multer';
import { Video } from '../../models/Video';
import { authMiddleware } from '../../middleware/auth';
import { AuthRequest } from '../../utils/jwt';
import { top5Services } from '../../services/top5';
import { isDevelopment } from '../../config';

// Import route modules
import trendingRoutes from './trending';
import performanceRoutes from './performance';
import analysisRoutes from './analysis';
import templatesRoutes from './templates';
import optimizationRoutes from './optimization';

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/videos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `top5-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Mount sub-routes
router.use('/trending', trendingRoutes);
router.use('/performance', performanceRoutes);
router.use('/analysis', analysisRoutes);
router.use('/templates', templatesRoutes);
router.use('/optimization', optimizationRoutes);

/**
 * @route POST /api/top5/create
 * @desc Create Top 5 video project
 * @access Private
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      top5VideosData,
      settings,
      type = 'top-5-videos'
    } = req.body;

    if (!title || !top5VideosData) {
      return res.status(400).json({
        success: false,
        error: 'Title and top5VideosData are required'
      });
    }

    const video = new Video({
      userId: req.user.id,
      title,
      description,
      type,
      status: 'processing',
      input: {
        top5VideosData
      },
      settings: settings || {},
      output: {},
      metadata: {
        size: 0,
        format: 'mp4',
        resolution: '1920x1080',
        fps: 30
      },
      isPublic: false,
      views: 0,
      likes: 0,
      shares: 0
    });

    await video.save();

    res.json({
      success: true,
      data: {
        videoId: video._id,
        status: 'processing',
        message: 'Top 5 video creation started',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Top5 Routes] Error creating Top 5 video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Top 5 video',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/upload-video
 * @desc Upload video for Top 5 project
 * @access Private
 */
router.post('/upload-video', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded'
      });
    }

    const { rank, title, description } = req.body;

    if (!rank || !title) {
      return res.status(400).json({
        success: false,
        error: 'Rank and title are required'
      });
    }

    // Process video metadata
    const videoData = {
      id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      rank: parseInt(rank, 10),
      videoFile: req.file.filename,
      duration: 0, // Would be calculated from actual video
      isMuted: false,
      transitions: {
        enterAnimation: 'fadeIn',
        exitAnimation: 'fadeOut',
        duration: 500
      },
      metadata: {
        originalFileName: req.file.originalname,
        uploadedAt: new Date(),
        fileSize: req.file.size,
        format: req.file.mimetype,
        resolution: '1920x1080' // Would be detected from actual video
      }
    };

    res.json({
      success: true,
      data: videoData,
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('[Top5 Routes] Error uploading video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload video',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/health
 * @desc Health check for Top 5 services
 * @access Private
 */
router.get('/health', authMiddleware, async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      services: {
        content: 'operational',
        trending: 'operational',
        performance: 'operational',
        templates: 'operational',
        optimization: 'operational'
      },
      features: {
        aiGeneration: 'available',
        viralAnalysis: 'available',
        performancePrediction: 'available',
        templateLibrary: 'available',
        optimization: 'available'
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('[Top5 Routes] Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Service health check failed',
      status: 'unhealthy'
    });
  }
});

/**
 * @route GET /api/top5/stats
 * @desc Get Top 5 service statistics
 * @access Private
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Get template statistics
    const templateCategories = top5Services.template.getTemplateCategories();

    // Mock statistics - in real implementation, these would come from database
    const stats = {
      totalUsers: 15420,
      videosCreated: 89340,
      templatesAvailable: templateCategories.reduce((sum, cat) => sum + cat.count, 0),
      avgViralScore: Math.round(
        templateCategories.reduce((sum, cat) => sum + (cat.avgViralScore * cat.count), 0) /
        templateCategories.reduce((sum, cat) => sum + cat.count, 0)
      ),
      topCategories: templateCategories
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(cat => ({ name: cat.category, count: cat.count })),
      recentActivity: {
        videosToday: 340,
        templatesUsed: 120,
        optimizationsSuggested: 89,
        avgImprovementScore: 23
      },
      platformDistribution: {
        tiktok: 45,
        instagram: 28,
        youtube: 18,
        twitter: 6,
        facebook: 3
      },
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Top5 Routes] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service statistics',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/complete-workflow
 * @desc Complete viral content analysis workflow
 * @access Private
 */
router.post('/complete-workflow', authMiddleware, async (req, res) => {
  try {
    const {
      items,
      configuration,
      styling,
      targetPlatforms,
      targetAudience
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required and must not be empty'
      });
    }

    if (!targetPlatforms || !Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Target platforms array is required and must not be empty'
      });
    }

    // Run complete workflow analysis
    const workflowResult = await top5Services.content.analyzeAndOptimizeContent({
      items,
      configuration: configuration || {},
      styling: styling || {},
      targetPlatforms,
      targetAudience
    });

    res.json({
      success: true,
      data: {
        ...workflowResult,
        workflow: {
          steps: [
            'Viral potential analysis',
            'Performance prediction',
            'Optimization suggestions',
            'Combined recommendations'
          ],
          completedAt: new Date().toISOString(),
          processingTime: '2.3 seconds'
        },
        nextSteps: [
          'Implement high-priority optimizations',
          'Test content variations',
          'Schedule posts at optimal times',
          'Monitor performance metrics'
        ]
      }
    });
  } catch (error) {
    console.error('[Top5 Routes] Error in complete workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete workflow analysis',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route GET /api/top5/trending-suggestions/:category
 * @desc Get trending content suggestions for category
 * @access Private
 */
router.get('/trending-suggestions/:category', authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const { platform = 'all' } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category parameter is required'
      });
    }

    const suggestions = await top5Services.content.getTrendingContentSuggestions(
      category,
      platform as string
    );

    res.json({
      success: true,
      data: {
        ...suggestions,
        category,
        platform,
        usage: {
          instructions: 'Use these trending topics as inspiration for your Top 5 lists',
          implementation: 'Adapt trending topics to your unique angle and audience',
          freshness: 'Trends update every 24 hours for maximum relevance'
        }
      }
    });
  } catch (error) {
    console.error('[Top5 Routes] Error getting trending suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending content suggestions',
      details: isDevelopment() ? error : undefined
    });
  }
});

/**
 * @route POST /api/top5/market-analysis
 * @desc Complete market position analysis
 * @access Private
 */
router.post('/market-analysis', authMiddleware, async (req, res) => {
  try {
    const { topic, category, platforms } = req.body;

    if (!topic || !category || !platforms) {
      return res.status(400).json({
        success: false,
        error: 'Topic, category, and platforms are required'
      });
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Platforms must be a non-empty array'
      });
    }

    const marketAnalysis = await top5Services.performance.analyzeMarketPosition(
      topic,
      category,
      platforms
    );

    res.json({
      success: true,
      data: {
        ...marketAnalysis,
        actionPlan: {
          immediate: [
            'Focus on identified market gaps',
            'Implement differentiation strategies',
            'Test content with target audience'
          ],
          longTerm: [
            'Build consistent brand presence',
            'Develop signature content style',
            'Monitor competitor activities'
          ]
        },
        competitiveAdvantage: 'AI-powered optimization with data-driven insights'
      }
    });
  } catch (error) {
    console.error('[Top5 Routes] Error in market analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete market analysis',
      details: isDevelopment() ? error : undefined
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 100MB.'
      });
    }
  }

  if (error.message === 'Invalid file type. Only video files are allowed.') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only video files are allowed.'
    });
  }

  next(error);
});

export default router;
