import type { PlanCode, UsageMetric } from "../domain/usage";

export type UsageRepository = {
  findPlanCode(userId: string): Promise<PlanCode>;
  countUsage(userId: string, metric: UsageMetric, period: string): Promise<number>;
  countUsageByMetric(userId: string, period: string): Promise<Record<UsageMetric, number>>;
  recordUsage(userId: string, metric: UsageMetric, period: string, quantity: number): Promise<void>;
};
