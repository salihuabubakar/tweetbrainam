"use client";

import type { SettingsSummaryValue, UsageMetricValue } from "@tweetbrainam/contracts";

type Plan = SettingsSummaryValue["plan"];

const metricLabels: Record<UsageMetricValue, string> = {
  draft_generated: "Drafts written for you",
  plan_generated: "Weekly plans",
  post_published: "Posts published",
};

const planLabels: Record<Plan["code"], string> = {
  free_beta: "Free beta",
  pro: "Pro",
  team: "Team",
};

function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function UsageCard({ plan }: { plan: Plan }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">{planLabels[plan.code]} plan</h2>
        <p className="text-muted-foreground text-sm">
          What you've used in {periodLabel(plan.period)}. Everything resets on the first of the
          month.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {plan.usage.map((line) => {
          const percent = line.limit === 0 ? 0 : Math.min(100, (line.used / line.limit) * 100);
          const isTight = line.remaining <= line.limit * 0.1;

          return (
            <li key={line.metric} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm">{metricLabels[line.metric]}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {line.used} of {line.limit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={isTight ? "h-full bg-destructive" : "h-full bg-primary"}
                  style={{ width: `${percent}%` }}
                />
              </div>
              {line.remaining === 0 ? (
                <span className="text-destructive text-xs">
                  You've used all of these for the month.
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
