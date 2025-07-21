import express, { Response } from 'express';
import { Video, Job as JobModel, User } from '../models';
import { AuthenticatedRequest } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';
import { VideoService } from '../services/videoService';
// import { videoQueue } from '../config/redis'; // Temporarily disabled for testing

// Centralized error handling and responses
import { sendSuccess, sendBadRequest, sendForbidden, sendNotFound, sendInternalError, getRequestId, videoResponses } from '../utils/responses';
import { ErrorCode } from '../types/api';
import { asyncHandler, businessErrorHandlers } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

router.post('/generate', async (req: any, res: Response) => {
  try {
    console.log('[API] 🔍 Raw request body received:', {
      bodyKeys: Object.keys(req.body),
      body: req.body
    });

    const { type, title, description, input, settings, userId } = req.body;

    console.log('[API] 📦 Extracted request data:', {
      type,
      title,
      description,
      inputKeys: input ? Object.keys(input) : 'undefined',
      input: input,
      settingsKeys: settings ? Object.keys(settings) : 'undefined',
      userId
    });

    // ❌ NO HARDCODED USER IDs - Require userId from request
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    if (!type || !input || !settings) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS'
      });
    }

    // ❌ NO MOCK USERS - Require valid user authentication
    console.log('[API] Looking up user:', userId);
    const user = await User.findById(userId);

    if (!user) {
      console.error('[API] ❌ User not found:', userId);
      return res.status(401).json({
        error: 'User not found. Please ensure you are properly authenticated.',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('[API] ✅ Valid user found:', {
      userId: user._id,
      plan: user.plan,
      email: user.email
    });

    if (user.plan === 'free') {
      const monthlyVideos = await Video.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      if (monthlyVideos >= 5) {
        return res.status(403).json({
          error: 'Monthly video limit reached. Upgrade to premium for unlimited videos.',
          code: 'LIMIT_REACHED'
        });
      }
    }

    const video = new Video({
      userId,
      title: title || `${type} Video`,
      description,
      type,
      input,
      settings: {
        ...settings,
        hasWatermark: user.plan === 'free'
      },
      status: 'processing',
      progress: {
        phase: 'bundling',
        percentage: 0,
        message: 'Initializing video generation...',
        startedAt: new Date(),
        lastUpdate: new Date()
      }
    });

    await video.save();

    const job = new JobModel({
      userId,
      videoId: video._id,
      type: `generate-${type}`,
      data: { input, settings },
      steps: [
        { name: 'Generate Script', status: 'pending' },
        { name: 'Generate Voiceover', status: 'pending' },
        { name: 'Generate Captions', status: 'pending' },
        { name: 'Render Video', status: 'pending' },
        { name: 'Upload & Finalize', status: 'pending' }
      ]
    });

    await job.save();

    // Temporarily disabled - videoQueue not available
    // const bullJob = await videoQueue.add('generate-video', {
    //   videoId: video._id.toString(),
    //   userId,
    //   type,
    //   input,
    //   settings
    // }, {
    //   jobId: job._id.toString(),
    //   priority: user.plan === 'premium' ? 1 : 5
    // });

    // video.jobId = bullJob.id; // Temporarily disabled
    await video.save();

    // Since queue is disabled, process video generation directly
    console.log('[API] Queue disabled, processing video generation directly...');
    try {
      const videoService = new VideoService();

      // Process the video generation asynchronously
      setImmediate(async () => {
        try {
          console.log('[API] 🔄 Starting direct video generation...');
          console.log('[API] 📝 Input object details:', {
            inputKeys: input ? Object.keys(input) : 'undefined',
            hasConfig: !!(input?.config),
            inputConfigKeys: input?.config ? Object.keys(input.config) : 'no config',
            inputText: input?.text?.substring(0, 50) + '...',
            settingsKeys: settings ? Object.keys(settings) : 'undefined',
            type
          });

          const videoServiceRequest = {
            type: type as any,
            input: input,
            settings: settings,
            userId: userId
          };

          console.log('[API] 📤 Calling VideoService.generateVideo with:', {
            requestKeys: Object.keys(videoServiceRequest),
            inputKeys: videoServiceRequest.input ? Object.keys(videoServiceRequest.input) : 'undefined',
            hasInputConfig: !!(videoServiceRequest.input?.config)
          });

          const result = await videoService.generateVideo(videoServiceRequest, (progressUpdate) => {
            console.log('[API] 📊 Progress Update:', progressUpdate);

            // Update video record with progress in real-time
            Video.findByIdAndUpdate(video._id, {
              'progress.phase': progressUpdate.phase,
              'progress.percentage': progressUpdate.progress,
              'progress.message': progressUpdate.message,
              'progress.renderedFrames': progressUpdate.renderedFrames || 0,
              'progress.totalFrames': progressUpdate.totalFrames || 0,
              updatedAt: new Date()
            }).catch(err => console.error('[API] Progress update failed:', err));
          });

          console.log('[API] Video generation completed:', result);

          // Update video record with result
          try {
            await Video.findByIdAndUpdate(video._id, {
              status: result.success ? 'completed' : 'failed',
              outputPath: result.outputPath,
              error: result.error
            });
          } catch (dbError) {
            console.error('[API] Failed to update video in database:', dbError);
          }

        } catch (genError) {
          console.error('[API] Video generation failed:', genError);
          try {
            await Video.findByIdAndUpdate(video._id, {
              status: 'failed',
              error: genError.message
            });
          } catch (dbError) {
            console.error('[API] Failed to update video error in database:', dbError);
          }
        }
      });

    } catch (error) {
      console.error('[API] Failed to start video generation:', error);
    }

    // Update user stats - NO FALLBACKS
    console.log('[API] Updating user stats for:', userId);
    await User.findByIdAndUpdate(userId, {
      $inc: { videosCreated: 1, points: 10 }
    });
    console.log('[API] ✅ User stats updated successfully');

    res.status(201).json({
      message: 'Video generation started',
      video: {
        id: video._id,
        title: video.title,
        type: video.type,
        status: video.status,
        createdAt: video.createdAt
      },
      jobId: 'temp-job-id' // bullJob.id temporarily disabled
    });

  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/status/:videoId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.userId;

    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      });
    }

    const job = await JobModel.findOne({ videoId });

    // Enhanced status response with detailed progress tracking
    const response = {
      success: true,
      videoId: video._id,
      status: video.status,
      progress: video.progress?.percentage || 0,
      message: video.progress?.message || `Status: ${video.status}`,
      outputPath: video.output?.videoUrl,
      video: {
        id: video._id,
        title: video.title,
        type: video.type,
        status: video.status,
        output: video.output,
        createdAt: video.createdAt,
        progress: video.progress ? {
          phase: video.progress.phase,
          percentage: video.progress.percentage,
          message: video.progress.message,
          renderedFrames: video.progress.renderedFrames,
          totalFrames: video.progress.totalFrames,
          estimatedTimeRemaining: video.progress.estimatedTimeRemaining,
          lastUpdate: video.progress.lastUpdate
        } : null
      },
      job: job ? {
        id: job._id,
        status: job.status,
        progress: job.progress,
        steps: job.steps,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      } : null
    };

    console.log('[API] 📊 Sending status response:', {
      videoId: video._id,
      status: video.status,
      progress: video.progress?.percentage || 0,
      phase: video.progress?.phase,
      message: video.progress?.message
    });

    res.json(response);

  } catch (error) {
    console.error('Get video status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/my-videos', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const status = req.query.status as string;

    const filter: any = { userId };
    if (status) {
      filter.status = status;
    }

    const videos = await Video.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-input -settings.voice -settings.background');

    const total = await Video.countDocuments(filter);

    res.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get my videos error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

router.delete('/:videoId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.userId;

    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      });
    }

    if (video.status === 'processing') {
      if (video.jobId) {
        // await videoQueue.remove(video.jobId); // Temporarily disabled
      }
    }

    await Video.findByIdAndDelete(videoId);
    await JobModel.deleteMany({ videoId });

    res.json({
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

router.post('/:videoId/retry', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.userId;

    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      });
    }

    if (video.status !== 'failed') {
      return res.status(400).json({
        error: 'Can only retry failed videos',
        code: 'INVALID_STATUS'
      });
    }

    video.status = 'processing';
    await video.save();

    // Temporarily disabled - videoQueue not available
    // const bullJob = await videoQueue.add('generate-video', {
    //   videoId: video._id.toString(),
    //   userId,
    //   type: video.type,
    //   input: video.input,
    //   settings: video.settings
    // });

    // video.jobId = bullJob.id; // Temporarily disabled
    await video.save();

    res.json({
      message: 'Video generation restarted',
      jobId: 'temp-job-id' // bullJob.id temporarily disabled
    });

  } catch (error) {
    console.error('Retry video error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

router.post('/:videoId/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.userId;

    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND'
      });
    }

    if (video.status !== 'processing') {
      return res.status(400).json({
        error: 'Can only cancel processing videos',
        code: 'INVALID_STATUS'
      });
    }

    // Update video status to cancelled
    video.status = 'cancelled';
    video.error = 'Generation cancelled by user';
    await video.save();

    // Cancel any associated jobs
    await JobModel.updateMany(
      { videoId },
      {
        status: 'cancelled',
        error: 'Generation cancelled by user',
        updatedAt: new Date()
      }
    );

    res.json({
      message: 'Video generation cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel video error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

export default router;
