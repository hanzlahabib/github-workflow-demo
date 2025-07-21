import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../utils/jwt';
import { ResourceLimits } from '../types/auth';

// Plan-based authorization middleware
export const requirePlan = (allowedPlans: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedPlans.includes(req.user.plan)) {
      return res.status(403).json({
        error: `Access requires one of the following plans: ${allowedPlans.join(', ')}`,
        code: 'INSUFFICIENT_PLAN',
        requiredPlans: allowedPlans,
        currentPlan: req.user.plan
      });
    }

    next();
  };
};

// Role-based authorization middleware (future-proofing for role system)
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // For now, map plans to roles
    const userRole = planToRole(req.user.plan);

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Access requires one of the following roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        currentRole: userRole
      });
    }

    next();
  };
};

// User ownership authorization - ensure user can only access their own resources
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];

    if (!resourceUserId) {
      return res.status(400).json({
        error: `${userIdField} is required`,
        code: 'MISSING_USER_ID'
      });
    }

    if (resourceUserId !== req.user.userId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied: You can only access your own resources',
        code: 'OWNERSHIP_REQUIRED'
      });
    }

    next();
  };
};

// Admin authorization (for future admin features)
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // For now, only premium users with admin flag (would be a user field in the future)
  if (req.user.plan !== 'premium') {
    return res.status(403).json({
      error: 'Administrator access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Specific plan authorization helpers
export const requirePremium = requirePlan(['premium']);
export const requireFreeOrPremium = requirePlan(['free', 'premium']);

// Combined authorization - check multiple conditions
export const requireConditions = (...middlewares: Array<(req: AuthenticatedRequest, res: Response, next: NextFunction) => void>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const runMiddleware = (index: number) => {
      if (index >= middlewares.length) {
        return next();
      }

      middlewares[index](req, res, (error?: any) => {
        if (error) {
          return next(error);
        }
        runMiddleware(index + 1);
      });
    };

    runMiddleware(0);
  };
};

// Helper function to map plans to roles (for future role system)
function planToRole(plan: string): string {
  const planRoleMap: Record<string, string> = {
    'free': 'user',
    'premium': 'premium_user',
    'enterprise': 'enterprise_user',
    'admin': 'admin'
  };

  return planRoleMap[plan] || 'user';
}

// Rate limiting based on plan (to be used with rate limiting middleware)
export const getPlanLimits = (plan: string) => {
  const limits: Record<string, { videosPerMonth: number; apiCallsPerMinute: number }> = {
    'free': { videosPerMonth: 5, apiCallsPerMinute: 10 },
    'premium': { videosPerMonth: -1, apiCallsPerMinute: 100 }, // -1 means unlimited
    'enterprise': { videosPerMonth: -1, apiCallsPerMinute: 500 }
  };

  return limits[plan] || limits['free'];
};

// Resource limit enforcement
export const enforceResourceLimits = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const limits = getPlanLimits(req.user.plan);

  // Add limits to request for use by route handlers
  (req as any).userLimits = limits;

  next();
};
