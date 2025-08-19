import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

interface UsageLimits {
  maxVideosPerMonth: number;
  maxVideoLengthSeconds: number;
  maxClipsPerVideo: number;
  maxConcurrentAnalyses: number;
}

const PLAN_LIMITS: Record<string, UsageLimits> = {
  free: {
    maxVideosPerMonth: 10,
    maxVideoLengthSeconds: 60,
    maxClipsPerVideo: 2,
    maxConcurrentAnalyses: 1,
  },
  premium: {
    maxVideosPerMonth: 100,
    maxVideoLengthSeconds: 300, // 5 minutes
    maxClipsPerVideo: 5,
    maxConcurrentAnalyses: 3,
  },
  enterprise: {
    maxVideosPerMonth: 1000,
    maxVideoLengthSeconds: 1800, // 30 minutes
    maxClipsPerVideo: 10,
    maxConcurrentAnalyses: 10,
  }
};

/**
 * Get user's current month video count
 */
async function getCurrentMonthVideoCount(userId: string): Promise<number> {
  // This is a simplified version. You should implement proper video tracking
  // For now, we'll use a mock implementation
  
  // In a real implementation, you'd query your video processing logs
  // and count videos created this month for this user
  
  try {
    const user = await User.findById(userId);
    if (!user) return 0;
    
    // Mock: return videosCreated as current month (you should implement proper monthly tracking)
    return user.videosCreated || 0;
  } catch (error) {
    logger.error('Error getting video count:', error);
    return 0;
  }
}

/**
 * Check if user can create a new video
 */
export const checkVideoCreationLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;
    const currentVideoCount = await getCurrentMonthVideoCount(userId);

    // Check monthly video limit
    if (currentVideoCount >= limits.maxVideosPerMonth) {
      const upgradeMessage = user.plan === 'free' 
        ? 'Upgrade to Pro for 100 videos per month' 
        : user.plan === 'premium'
        ? 'Upgrade to Enterprise for 1000 videos per month'
        : 'Contact support for higher limits';

      res.status(429).json({
        error: 'Monthly video limit reached',
        currentUsage: currentVideoCount,
        limit: limits.maxVideosPerMonth,
        plan: user.plan,
        upgradeMessage,
        upgradeRequired: user.plan === 'free' ? 'pro' : user.plan === 'premium' ? 'enterprise' : null
      });
      return;
    }

    // Check video length if provided
    const videoLength = req.body.duration || req.body.settings?.duration;
    if (videoLength && videoLength > limits.maxVideoLengthSeconds) {
      const upgradeMessage = user.plan === 'free' 
        ? 'Upgrade to Pro for videos up to 5 minutes' 
        : user.plan === 'premium'
        ? 'Upgrade to Enterprise for videos up to 30 minutes'
        : 'Contact support for longer video limits';

      res.status(413).json({
        error: 'Video too long for current plan',
        videoLength,
        maxLength: limits.maxVideoLengthSeconds,
        plan: user.plan,
        upgradeMessage,
        upgradeRequired: user.plan === 'free' ? 'pro' : user.plan === 'premium' ? 'enterprise' : null
      });
      return;
    }

    // Add usage info to request for downstream processing
    req.body.usageInfo = {
      plan: user.plan,
      limits,
      currentUsage: currentVideoCount,
      remainingVideos: limits.maxVideosPerMonth - currentVideoCount
    };

    next();
  } catch (error) {
    logger.error('Error checking video creation limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if user can generate clips
 */
export const checkClipGenerationLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;
    const requestedClips = req.body.numClips || req.body.maxClipsPerVideo || 3;

    // Check clips per video limit
    if (requestedClips > limits.maxClipsPerVideo) {
      const upgradeMessage = user.plan === 'free' 
        ? 'Upgrade to Pro for up to 5 clips per video' 
        : user.plan === 'premium'
        ? 'Upgrade to Enterprise for up to 10 clips per video'
        : 'Contact support for higher clip limits';

      res.status(429).json({
        error: 'Too many clips requested for current plan',
        requestedClips,
        maxClips: limits.maxClipsPerVideo,
        plan: user.plan,
        upgradeMessage,
        upgradeRequired: user.plan === 'free' ? 'pro' : user.plan === 'premium' ? 'enterprise' : null
      });
      return;
    }

    // Add watermark for free users
    if (user.plan === 'free') {
      req.body.addWatermark = true;
      req.body.watermarkText = 'Created with ReelSpeed';
    }

    next();
  } catch (error) {
    logger.error('Error checking clip generation limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Track successful video creation (call this after successful processing)
 */
export const trackVideoCreation = async (userId: string): Promise<void> => {
  try {
    await User.findByIdAndUpdate(userId, {
      $inc: { videosCreated: 1 }
    });
    
    logger.info(`Tracked video creation for user ${userId}`);
  } catch (error) {
    logger.error('Error tracking video creation:', error);
  }
};

/**
 * Get user usage summary
 */
export const getUserUsage = async (userId: string): Promise<{
  plan: string;
  videosThisMonth: number;
  videosRemaining: number;
  limits: UsageLimits;
}> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;
    const videosThisMonth = await getCurrentMonthVideoCount(userId);
    const videosRemaining = Math.max(0, limits.maxVideosPerMonth - videosThisMonth);

    return {
      plan: user.plan,
      videosThisMonth,
      videosRemaining,
      limits
    };
  } catch (error) {
    logger.error('Error getting user usage:', error);
    throw error;
  }
};

/**
 * Check if user has premium features access
 */
export const checkPremiumFeature = (
  featureName: string
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Premium features require non-free plan
      if (user.plan === 'free') {
        res.status(403).json({
          error: `${featureName} requires premium plan`,
          feature: featureName,
          currentPlan: user.plan,
          upgradeRequired: 'pro',
          upgradeMessage: `Upgrade to Pro to access ${featureName}`
        });
        return;
      }

      // Check if subscription is active (if they have Stripe subscription)
      if (user.subscription && user.subscription.status !== 'active') {
        res.status(403).json({
          error: 'Subscription is not active',
          subscriptionStatus: user.subscription.status,
          message: 'Please update your payment method or contact support'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error checking premium feature access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};