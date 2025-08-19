import Stripe from 'stripe';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Product and price IDs (set these in your Stripe dashboard)
export const STRIPE_PLANS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
  ENTERPRISE_MONTHLY: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
  ENTERPRISE_YEARLY: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
} as const;

export class StripeService {
  /**
   * Create or retrieve Stripe customer for user
   */
  static async createOrGetCustomer(user: IUser): Promise<string> {
    if (user.subscription?.stripeCustomerId) {
      return user.subscription.stripeCustomerId;
    }

    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
        },
      });

      // Update user with customer ID
      await User.findByIdAndUpdate(user._id, {
        'subscription.stripeCustomerId': customer.id,
      });

      logger.info(`Created Stripe customer ${customer.id} for user ${user._id}`);
      return customer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Create checkout session for subscription upgrade
   */
  static async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const customerId = await this.createOrGetCustomer(user);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
        },
        subscription_data: {
          metadata: {
            userId: userId,
          },
        },
      });

      logger.info(`Created checkout session ${session.id} for user ${userId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Create customer portal session for subscription management
   */
  static async createPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription?.stripeCustomerId) {
        throw new Error('No subscription found');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.subscription.stripeCustomerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create portal session:', error);
      throw new Error('Failed to create portal session');
    }
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(
    body: string | Buffer,
    signature: string
  ): Promise<void> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }

    logger.info(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata?.userId;
      if (!userId) {
        logger.error('No userId in checkout session metadata');
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
        { expand: ['items.data.price.product'] }
      );

      await this.updateUserSubscription(userId, subscription);
      logger.info(`Checkout completed for user ${userId}`);
    } catch (error) {
      logger.error('Error handling checkout completion:', error);
    }
  }

  /**
   * Handle subscription updates
   */
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata?.userId;
      if (!userId) {
        // Try to find user by customer ID
        const user = await User.findOne({
          'subscription.stripeCustomerId': subscription.customer as string,
        });
        if (user) {
          await this.updateUserSubscription(user._id.toString(), subscription);
        } else {
          logger.error('No user found for subscription update');
        }
        return;
      }

      await this.updateUserSubscription(userId, subscription);
      logger.info(`Subscription updated for user ${userId}`);
    } catch (error) {
      logger.error('Error handling subscription update:', error);
    }
  }

  /**
   * Handle subscription deletion
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata?.userId;
      if (!userId) {
        const user = await User.findOne({
          'subscription.stripeCustomerId': subscription.customer as string,
        });
        if (!user) {
          logger.error('No user found for subscription deletion');
          return;
        }
      }

      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        {
          plan: 'free',
          'subscription.status': 'canceled',
        }
      );

      logger.info(`Subscription canceled for subscription ${subscription.id}`);
    } catch (error) {
      logger.error('Error handling subscription deletion:', error);
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        
        const userId = subscription.metadata?.userId;
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            'subscription.status': 'active',
            'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
          });
          
          logger.info(`Payment succeeded for user ${userId}`);
        }
      }
    } catch (error) {
      logger.error('Error handling payment success:', error);
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        
        const userId = subscription.metadata?.userId;
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            'subscription.status': 'past_due',
          });
          
          logger.info(`Payment failed for user ${userId}`);
        }
      }
    } catch (error) {
      logger.error('Error handling payment failure:', error);
    }
  }

  /**
   * Update user subscription data from Stripe subscription
   */
  private static async updateUserSubscription(
    userId: string,
    subscription: Stripe.Subscription
  ): Promise<void> {
    try {
      // Determine plan based on price ID
      let plan: 'free' | 'premium' = 'free';
      const priceId = subscription.items.data[0]?.price.id;

      if (
        priceId === STRIPE_PLANS.PRO_MONTHLY || 
        priceId === STRIPE_PLANS.PRO_YEARLY
      ) {
        plan = 'premium';
      } else if (
        priceId === STRIPE_PLANS.ENTERPRISE_MONTHLY || 
        priceId === STRIPE_PLANS.ENTERPRISE_YEARLY
      ) {
        plan = 'premium'; // You might want to add 'enterprise' to the User model
      }

      await User.findByIdAndUpdate(userId, {
        plan,
        'subscription.stripeSubscriptionId': subscription.id,
        'subscription.status': subscription.status as 'active' | 'canceled' | 'past_due',
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
      });

      logger.info(`Updated subscription for user ${userId}: plan=${plan}, status=${subscription.status}`);
    } catch (error) {
      logger.error('Error updating user subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription status for user
   */
  static async getSubscriptionStatus(userId: string): Promise<{
    plan: 'free' | 'premium';
    status?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.subscription?.stripeSubscriptionId) {
        return { plan: 'free' };
      }

      const subscription = await stripe.subscriptions.retrieve(
        user.subscription.stripeSubscriptionId
      );

      return {
        plan: user.plan,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      logger.error('Error getting subscription status:', error);
      throw error;
    }
  }
}

export { stripe };