import type { Subscription, UsageMetric } from "../domain/usage";

export type UsageRepository = {
  findSubscription(userId: string): Promise<Subscription | null>;
  startTrial(userId: string, trialEndsAt: Date): Promise<void>;
  countUsage(userId: string, metric: UsageMetric, period: string): Promise<number>;
  countUsageByMetric(userId: string, period: string): Promise<Record<UsageMetric, number>>;
  recordUsage(userId: string, metric: UsageMetric, period: string, quantity: number): Promise<void>;
};
