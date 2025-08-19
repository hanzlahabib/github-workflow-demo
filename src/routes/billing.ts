import express from 'express';
import { StripeService, STRIPE_PLANS } from '../services/stripe';
import { auth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { User } from '../models/User';

const router = express.Router();

/**
 * Get current subscription status
 */
router.get('/subscription', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const status = await StripeService.getSubscriptionStatus(userId);
    res.json(status);
  } catch (error) {
    logger.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * Create checkout session for plan upgrade
 */
router.post('/checkout', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { plan, billing } = req.body;
    
    // Validate plan and billing cycle
    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    if (!billing || !['monthly', 'yearly'].includes(billing)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    // Map to Stripe price IDs
    let priceId: string;
    if (plan === 'pro' && billing === 'monthly') {
      priceId = STRIPE_PLANS.PRO_MONTHLY;
    } else if (plan === 'pro' && billing === 'yearly') {
      priceId = STRIPE_PLANS.PRO_YEARLY;
    } else if (plan === 'enterprise' && billing === 'monthly') {
      priceId = STRIPE_PLANS.ENTERPRISE_MONTHLY;
    } else {
      priceId = STRIPE_PLANS.ENTERPRISE_YEARLY;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/billing/success`;
    const cancelUrl = `${baseUrl}/billing/canceled`;

    const session = await StripeService.createCheckoutSession(
      userId,
      priceId,
      successUrl,
      cancelUrl
    );

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * Create customer portal session for subscription management
 */
router.post('/portal', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${baseUrl}/billing`;

    const session = await StripeService.createPortalSession(userId, returnUrl);
    
    res.json({ portalUrl: session.url });
  } catch (error) {
    logger.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * Get available plans and pricing
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = {
      free: {
        name: 'Free',
        price: 0,
        interval: 'month',
        features: [
          '10 videos per month',
          'Up to 60 seconds per video',
          'Basic transcription',
          'Sentiment analysis',
          '2 clips per video',
          '720p quality',
          'Watermarked clips',
          'Community support'
        ],
        limits: {
          maxVideosPerMonth: 10,
          maxVideoLengthSeconds: 60,
          maxClipsPerVideo: 2,
          clipQuality: '720p',
          watermarkOnClips: true,
          supportLevel: 'community'
        }
      },
      pro: {
        name: 'Pro',
        monthlyPrice: 29,
        yearlyPrice: 290,
        savingsPercent: 17,
        features: [
          '100 videos per month',
          'Up to 5 minutes per video',
          'All analysis features',
          'Speaker identification',
          'Topic analysis',
          '5 clips per video',
          '1080p quality',
          'No watermarks',
          'Custom branding',
          'API access',
          'Email support'
        ],
        limits: {
          maxVideosPerMonth: 100,
          maxVideoLengthSeconds: 300,
          maxClipsPerVideo: 5,
          clipQuality: '1080p',
          watermarkOnClips: false,
          customBranding: true,
          apiAccess: true,
          supportLevel: 'email'
        }
      },
      enterprise: {
        name: 'Enterprise',
        monthlyPrice: 99,
        yearlyPrice: 990,
        savingsPercent: 17,
        features: [
          '1000 videos per month',
          'Up to 30 minutes per video',
          'All premium features',
          'Advanced analytics',
          '10 clips per video',
          '4K quality',
          'Priority processing',
          'Custom integrations',
          'Priority support',
          'Dedicated account manager'
        ],
        limits: {
          maxVideosPerMonth: 1000,
          maxVideoLengthSeconds: 1800,
          maxClipsPerVideo: 10,
          clipQuality: '4K',
          watermarkOnClips: false,
          customBranding: true,
          apiAccess: true,
          processingPriority: 'high',
          supportLevel: 'priority'
        }
      }
    };

    res.json({ plans });
  } catch (error) {
    logger.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * Get user's usage statistics
 */
router.get('/usage', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // You'll need to implement this based on your video tracking system
    const usage = {
      currentPlan: user.plan,
      videosThisMonth: user.videosCreated || 0, // This should be current month only
      maxVideosPerMonth: user.plan === 'premium' ? 100 : 10,
      
      // These would come from your video processing analytics
      averageVideoLength: 45, // seconds
      maxVideoLength: user.plan === 'premium' ? 300 : 60,
      
      totalClipsGenerated: 0, // implement based on your system
      averageClipsPerVideo: 2.3,
      
      storageUsed: '250MB', // implement based on your storage tracking
      
      // Subscription info
      subscriptionStatus: user.subscription?.status || 'none',
      currentPeriodEnd: user.subscription?.currentPeriodEnd,
    };

    res.json(usage);
  } catch (error) {
    logger.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

/**
 * Stripe webhook handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe signature' });
    }

    await StripeService.handleWebhook(req.body, signature);
    
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;