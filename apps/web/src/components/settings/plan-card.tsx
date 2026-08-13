"use client";

import type { SettingsSummaryValue, UsageMetricValue } from "@tweetbrainam/contracts";

type Plan = SettingsSummaryValue["plan"];

const metricLabels: Record<UsageMetricValue, string> = {
  draft_generated: "Drafts written for you",
  plan_generated: "Weekly plans",
  post_published: "Posts published",
};

const planLabels: Record<Plan["code"], string> = {
  trial: "Free trial",
  free_beta: "Free beta",
  pro: "Pro",
  team: "Team",
};

function periodLabel(plan: Plan): string {
  if (plan.code === "trial") return "your trial";

  const [year, month] = plan.period.split("-").map(Number);
  if (!year || !month) return plan.period;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function statusLine(plan: Plan): string {
  if (plan.isExpired) {
    return "Your trial has ended. Everything you made is still here to read.";
  }

  if (plan.code === "trial") {
    const days = plan.trialDaysRemaining;
    return days === 1 ? "Last day of your trial." : `${days} days left in your trial.`;
  }

  return `What you've used in ${periodLabel(plan)}. Everything resets on the first of the month.`;
}

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <section
      className={
        plan.isExpired
          ? "flex flex-col gap-4 rounded-lg border border-destructive/40 bg-card p-6"
          : "flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
      }
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">{planLabels[plan.code]}</h2>
        <p
          className={plan.isExpired ? "text-destructive text-sm" : "text-muted-foreground text-sm"}
        >
          {statusLine(plan)}
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
                  {plan.code === "trial"
                    ? "That's everything your trial includes."
                    : "You've used all of these for the month."}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
