import { type DomainError, domainError } from "../domain/errors";
import { type QuotaCheck, type UsageMetric, checkQuota, currentPeriod } from "../domain/usage";
import { type Result, err, ok } from "../lib/result";
import type { Clock } from "../ports/clock";
import type { UsageRepository } from "../ports/usage-repository";

export type QuotaDeps = {
  usage: UsageRepository;
  clock: Clock;
};

export async function checkUserQuota(
  deps: QuotaDeps,
  input: { userId: string; metric: UsageMetric },
): Promise<Result<QuotaCheck, DomainError>> {
  const period = currentPeriod(deps.clock.now());
  const planCode = await deps.usage.findPlanCode(input.userId);
  const used = await deps.usage.countUsage(input.userId, input.metric, period);
  const check = checkQuota(planCode, input.metric, used);

  if (!check.allowed) {
    return err(
      domainError(
        "quota_exceeded",
        `You've used all ${check.limit} of this month's allowance. It resets at the start of next month.`,
      ),
    );
  }

  return ok(check);
}

export async function recordUsage(
  deps: QuotaDeps,
  input: { userId: string; metric: UsageMetric; quantity?: number },
): Promise<void> {
  await deps.usage.recordUsage(
    input.userId,
    input.metric,
    currentPeriod(deps.clock.now()),
    input.quantity ?? 1,
  );
}
