import { type DomainError, domainError } from "../domain/errors";
import type { XAccountSummary } from "../domain/identity";
import type { ContentGoal } from "../domain/onboarding";
import {
  type PlanCode,
  type SubscriptionStatus,
  type UsageMetric,
  checkQuota,
  isTrialExpired,
  quotaPeriod,
  trialDaysRemaining,
  usageMetrics,
} from "../domain/usage";
import { type Result, err, ok } from "../lib/result";
import type { Clock } from "../ports/clock";
import type { IdentityRepository } from "../ports/identity-repository";
import type { UsageRepository } from "../ports/usage-repository";
import { loadSubscription } from "./enforce-quota";

export type UsageLine = {
  metric: UsageMetric;
  used: number;
  limit: number;
  remaining: number;
};

export type SettingsSummary = {
  account: XAccountSummary | null;
  cadence: {
    goal: ContentGoal | null;
    postsPerWeek: number;
    timezone: string;
  };
  plan: {
    code: PlanCode;
    period: string;
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    trialDaysRemaining: number;
    isExpired: boolean;
    usage: UsageLine[];
  };
};

export type GetSettingsDeps = {
  identity: IdentityRepository;
  usage: UsageRepository;
  clock: Clock;
};

const DEFAULT_POSTS_PER_WEEK = 5;

export async function getSettings(
  deps: GetSettingsDeps,
  input: { userId: string },
): Promise<Result<SettingsSummary, DomainError>> {
  const user = await deps.identity.findUserById(input.userId);
  if (!user) return err(domainError("user_not_found", "Account not found."));

  const account = await deps.identity.findXAccountSummary(user.id);
  const now = deps.clock.now();
  const subscription = await loadSubscription(deps, user.id);
  const period = quotaPeriod(subscription.planCode, now);

  const counts = await deps.usage.countUsageByMetric(user.id, period);
  const usage = usageMetrics.map((metric) => {
    const used = counts[metric];
    const { limit, remaining } = checkQuota(subscription.planCode, metric, used);
    return { metric, used, limit, remaining };
  });

  return ok({
    account,
    cadence: {
      goal: user.preferences?.goal ?? null,
      postsPerWeek: user.preferences?.postsPerWeek ?? DEFAULT_POSTS_PER_WEEK,
      timezone: user.timezone,
    },
    plan: {
      code: subscription.planCode,
      period,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      trialDaysRemaining: trialDaysRemaining(subscription, now),
      isExpired: isTrialExpired(subscription, now),
      usage,
    },
  });
}
