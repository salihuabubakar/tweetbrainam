import { type UsageMetric, checkUserQuota } from "@tweetbrainam/core";
import type { AppDeps } from "../deps";
import { ApiError, quotaExceeded } from "./errors";

export async function requireQuota(
  deps: AppDeps,
  input: { userId: string; metric: UsageMetric },
): Promise<void> {
  const quota = await checkUserQuota(deps, input);
  if (quota.ok) return;

  if (quota.error.code === "trial_expired") {
    throw new ApiError("trial_expired", quota.error.message, 402);
  }

  throw quotaExceeded(quota.error.message);
}
