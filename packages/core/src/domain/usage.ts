export const usageMetrics = ["draft_generated", "plan_generated", "post_published"] as const;

export type UsageMetric = (typeof usageMetrics)[number];

export const planCodes = ["free_beta", "pro", "team"] as const;

export type PlanCode = (typeof planCodes)[number];

export type PlanLimits = Record<UsageMetric, number>;

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  free_beta: { draft_generated: 120, plan_generated: 8, post_published: 60 },
  pro: { draft_generated: 600, plan_generated: 40, post_published: 300 },
  team: { draft_generated: 2000, plan_generated: 160, post_published: 1000 },
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
