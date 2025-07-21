import express from 'express';
import { Video } from '../../models/Video';
import { authMiddleware } from '../../middleware/auth';
import { AuthRequest } from '../../types/auth';

// Import sub-routers
import trendingRouter from './trending';
import templatesRouter from './templates';
import optimizationRouter from './optimization';
import performanceRouter from './performance';
import analysisRouter from './analysis';

const router = express.Router();

// Mount sub-routers
router.use('/', trendingRouter);
router.use('/', templatesRouter);
router.use('/', optimizationRouter);
router.use('/', performanceRouter);
router.use('/', analysisRouter);

// Create Twitter video project
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      twitterData,
      settings,
      type = 'twitter-video'
    } = req.body;

    const video = new Video({
      userId: req.user.id,
      title,
      description,
      type,
      status: 'processing',
      input: {
        twitterData
      },
      settings,
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
        message: 'Twitter video creation started'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create Twitter video'
    });
  }
});

export default router;
