import { type DomainError, domainError } from "../domain/errors";
import {
  GRANDFATHERED_SUBSCRIPTION,
  type QuotaCheck,
  type Subscription,
  type UsageMetric,
  canGenerate,
  checkQuota,
  quotaPeriod,
  trialDaysRemaining,
} from "../domain/usage";
import { type Result, err, ok } from "../lib/result";
import type { Clock } from "../ports/clock";
import type { UsageRepository } from "../ports/usage-repository";

export type QuotaDeps = {
  usage: UsageRepository;
  clock: Clock;
};

export async function loadSubscription(deps: QuotaDeps, userId: string): Promise<Subscription> {
  return (await deps.usage.findSubscription(userId)) ?? GRANDFATHERED_SUBSCRIPTION;
}

export async function checkUserQuota(
  deps: QuotaDeps,
  input: { userId: string; metric: UsageMetric },
): Promise<Result<QuotaCheck, DomainError>> {
  const now = deps.clock.now();
  const subscription = await loadSubscription(deps, input.userId);

  if (!canGenerate(subscription, now)) {
    return err(
      domainError(
        "trial_expired",
        "Your free trial has ended. Everything you made is still here to read — get in touch to keep going.",
      ),
    );
  }

  const period = quotaPeriod(subscription.planCode, now);
  const used = await deps.usage.countUsage(input.userId, input.metric, period);
  const check = checkQuota(subscription.planCode, input.metric, used);

  if (!check.allowed) {
    const reset =
      subscription.planCode === "trial"
        ? `That's everything your ${trialDaysRemaining(subscription, now)}-day trial includes.`
        : "It resets at the start of next month.";

    return err(
      domainError("quota_exceeded", `You've used all ${check.limit} of your allowance. ${reset}`),
    );
  }

  return ok(check);
}

export async function recordUsage(
  deps: QuotaDeps,
  input: { userId: string; metric: UsageMetric; quantity?: number },
): Promise<void> {
  const subscription = await loadSubscription(deps, input.userId);
  const period = quotaPeriod(subscription.planCode, deps.clock.now());

  await deps.usage.recordUsage(input.userId, input.metric, period, input.quantity ?? 1);
}
