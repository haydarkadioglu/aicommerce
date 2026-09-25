import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notify";

/**
 * Subscription / usage-limit helpers.
 *
 * The platform's SubscriptionPlan model stores `limits` as a JSON string
 * with shape like:
 *   { aiCallsPerMonth: 100, projects: 3, marketplaces: 1 }
 * Negative values mean "unlimited".
 *
 * If a user has no subscription record, they default to the plan with
 * `isDefault = true` (the Free plan).
 */

export type PlanLimits = {
  aiCallsPerMonth?: number;
  projects?: number;
  marketplaces?: number;
  // future: tokensPerMonth, imagesPerMonth, etc.
};

export type UsageCheckResult = {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
  planKey: string;
  planName: string;
};

const DEFAULT_LIMITS: PlanLimits = {
  aiCallsPerMonth: 30, // matches platform.max_free_ai_calls_per_day fallback
  projects: 3,
  marketplaces: 1,
};

/**
 * Get the user's subscription plan + limits. Falls back to the default
 * plan if no subscription record exists.
 */
export async function getUserPlan(userId: string): Promise<{
  planKey: string;
  planName: string;
  limits: PlanLimits;
  subscriptionId: string | null;
}> {
  // Try to load the user's subscription
  const subscription = await db.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  let plan = subscription?.plan;
  if (!plan) {
    plan = await db.subscriptionPlan.findFirst({
      where: { isDefault: true },
    });
  }
  if (!plan) {
    plan = await db.subscriptionPlan.findFirst({
      where: { key: "free" },
    });
  }

  let limits: PlanLimits = DEFAULT_LIMITS;
  if (plan?.limits) {
    try {
      limits = JSON.parse(plan.limits) as PlanLimits;
    } catch {
      // keep defaults
    }
  }

  return {
    planKey: plan?.key || "free",
    planName: plan?.name || "Free",
    limits,
    subscriptionId: subscription?.id || null,
  };
}

/**
 * Check whether a user can make another AI call this month.
 * Returns allowed=false if they've hit their plan's monthly limit.
 */
export async function checkAiCallLimit(
  userId: string
): Promise<UsageCheckResult> {
  const { planKey, planName, limits } = await getUserPlan(userId);
  const limit = limits.aiCallsPerMonth ?? 0;

  // Unlimited
  if (limit < 0) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
      planKey,
      planName,
    };
  }

  // Count this month's calls
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await db.aiUsage.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
      // Image generations count too
    },
  });

  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  // Warn at 80% and 100% usage (fire-and-forget)
  if (allowed && limit > 0) {
    const pct = (used / limit) * 100;
    if (pct >= 80 && pct < 90) {
      // Only notify once at exactly 80%
      // (avoid spamming — a notification for the first call past 80%)
      const prevPct = ((used - 1) / limit) * 100;
      if (prevPct < 80) {
        notify({
          userId,
          type: "warning",
          title: `Approaching AI call limit`,
          message: `You've used ${used}/${limit} of your ${planName} plan's monthly AI calls. Consider upgrading to keep going.`,
          link: "/?view=settings",
        }).catch(() => {});
      }
    }
    if (pct >= 100 && prevMonthNotReached(used, limit)) {
      notify({
        userId,
        type: "warning",
        title: `AI call limit reached`,
        message: `You've used all ${limit} of your ${planName} plan's monthly AI calls. New calls are blocked until next month or upgrade.`,
        link: "/?view=settings",
      }).catch(() => {});
    }
  }

  return {
    allowed,
    reason: !allowed
      ? `You've reached your ${planName} plan limit of ${limit} AI calls per month. Please upgrade your plan.`
      : undefined,
    used,
    limit,
    remaining,
    planKey,
    planName,
  };
}

function prevMonthNotReached(used: number, limit: number): boolean {
  // Simple helper to avoid spamming — only notify when we cross 100%
  return used === limit;
}

/**
 * Check whether a user can create a new project.
 */
export async function checkProjectLimit(
  userId: string
): Promise<UsageCheckResult> {
  const { planKey, planName, limits } = await getUserPlan(userId);
  const limit = limits.projects ?? 0;

  if (limit < 0) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
      planKey,
      planName,
    };
  }

  const used = await db.project.count({ where: { userId } });
  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  return {
    allowed,
    reason: !allowed
      ? `You've reached your ${planName} plan limit of ${limit} projects. Please upgrade your plan.`
      : undefined,
    used,
    limit,
    remaining,
    planKey,
    planName,
  };
}
