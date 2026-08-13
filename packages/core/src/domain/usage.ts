export const usageMetrics = ["draft_generated", "plan_generated", "post_published"] as const;

export type UsageMetric = (typeof usageMetrics)[number];

export const planCodes = ["trial", "free_beta", "pro", "team"] as const;

export type PlanCode = (typeof planCodes)[number];

export const subscriptionStatuses = [
  "trialing",
  "active",
  "expired",
  "canceled",
  "past_due",
] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export type Subscription = {
  planCode: PlanCode;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
};

export type PlanLimits = Record<UsageMetric, number>;

export const TRIAL_DAYS = 7;

const TRIAL_PERIOD = "trial";

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  trial: { draft_generated: 20, plan_generated: 2, post_published: 10 },
  free_beta: { draft_generated: 120, plan_generated: 8, post_published: 60 },
  pro: { draft_generated: 600, plan_generated: 40, post_published: 300 },
  team: { draft_generated: 2000, plan_generated: 160, post_published: 1000 },
};

export const PLAN_SCAN_LIMITS: Record<PlanCode, number> = {
  trial: 60,
  free_beta: 200,
  pro: 800,
  team: 3200,
};

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
};

export function checkQuota(planCode: PlanCode, metric: UsageMetric, used: number): QuotaCheck {
  const limit = PLAN_LIMITS[planCode][metric];
  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, used, limit, remaining };
}

export function currentPeriod(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function quotaPeriod(planCode: PlanCode, now: Date): string {
  return planCode === "trial" ? TRIAL_PERIOD : currentPeriod(now);
}

export function trialEndsAtFrom(startedAt: Date): Date {
  return new Date(startedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function isTrialExpired(subscription: Subscription, now: Date): boolean {
  if (subscription.planCode !== "trial") return false;
  if (!subscription.trialEndsAt) return false;
  return subscription.trialEndsAt.getTime() <= now.getTime();
}

export function canGenerate(subscription: Subscription, now: Date): boolean {
  if (isTrialExpired(subscription, now)) return false;
  return subscription.status === "trialing" || subscription.status === "active";
}

export function trialDaysRemaining(subscription: Subscription, now: Date): number {
  if (subscription.planCode !== "trial" || !subscription.trialEndsAt) return 0;
  const remainingMs = subscription.trialEndsAt.getTime() - now.getTime();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export const GRANDFATHERED_SUBSCRIPTION: Subscription = {
  planCode: "free_beta",
  status: "active",
  trialEndsAt: null,
};
