"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type { ContentPlanValue, PlanSlotValue } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 3000;

const statusLabels: Record<PlanSlotValue["status"], string> = {
  empty: "Not drafted",
  drafting: "Writing…",
  ready: "Ready to review",
  approved: "Approved",
  published: "Published",
  skipped: "Skipped",
};

function timeOfDayLabel(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Midday";
  return "Evening";
}

function groupByDay(slots: PlanSlotValue[]) {
  const days = new Map<string, { label: string; slots: PlanSlotValue[] }>();

  for (const slot of slots) {
    const date = new Date(slot.targetAt);
    const key = date.toDateString();
    const existing = days.get(key);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }
    days.set(key, {
      label: date.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "short",
      }),
      slots: [slot],
    });
  }

  return [...days.values()];
}

function SlotCard({ slot }: { slot: PlanSlotValue }) {
  const date = new Date(slot.targetAt);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="font-medium">{timeOfDayLabel(date)}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">
          {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      <span className="font-medium text-sm">{slot.topic}</span>
      <p className="text-muted-foreground text-sm">{slot.angle}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs">
          {slot.format === "thread" ? "Thread" : "Single post"}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            slot.status === "empty" ? "bg-muted text-muted-foreground" : "bg-accent",
          )}
        >
          {statusLabels[slot.status]}
        </span>
      </div>
    </li>
  );
}

type Week = "this" | "next";

type PlanResponse = {
  plan: ContentPlanValue | null;
  week: Week;
  weekStart: string;
};

function WeekTabs({ week, onSelect }: { week: Week; onSelect: (next: Week) => void }) {
  const tabs: { value: Week; label: string }[] = [
    { value: "this", label: "This week" },
    { value: "next", label: "Next week" },
  ];

  return (
    <div className="inline-flex gap-1 self-start rounded-lg border border-border bg-muted p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-current={week === tab.value ? "true" : undefined}
          onClick={() => onSelect(tab.value)}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
            week === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function WeekPlan({
  onReady,
  showWeekSwitcher = false,
}: {
  onReady?: (plan: ContentPlanValue) => void;
  showWeekSwitcher?: boolean;
}) {
  const { value: week, setValue: setWeek } = useDurableState<Week>("plan:week", "this");
  const [plan, setPlan] = useState<ContentPlanValue | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPlan(null);
    setHasChecked(false);

    async function poll() {
      const response = await fetch(`${apiUrl}/v1/plans/current?week=${week}`, {
        credentials: "include",
      });
      if (!response.ok || cancelled) return;
      const body = (await response.json()) as PlanResponse;
      if (cancelled) return;

      setHasChecked(true);
      setPlan(body.plan);
      if (body.plan) {
        setIsGenerating(false);
        onReady?.(body.plan);
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [onReady, week]);

  async function handleGenerate() {
    setIsGenerating(true);
    await fetch(`${apiUrl}/v1/plans/generate`, { method: "POST", credentials: "include" });
  }

  const switcher = showWeekSwitcher ? <WeekTabs week={week} onSelect={setWeek} /> : null;

  if (plan) {
    const days = groupByDay(plan.slots);

    return (
      <div className="flex flex-col gap-5">
        {switcher}
        <p className="text-muted-foreground text-sm">{plan.rationale}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {days.map((day) => (
            <section key={day.label} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-medium text-sm">{day.label}</h2>
                <span className="text-muted-foreground text-xs">
                  {day.slots.length} {day.slots.length === 1 ? "post" : "posts"}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {day.slots.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {switcher}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border border-dashed py-12 text-center">
        <p className="text-muted-foreground text-sm">
          {isGenerating
            ? "Choosing what you should write about this week…"
            : !hasChecked
              ? "Checking your plan…"
              : week === "next"
                ? "Next week isn't planned yet. We put it together every Sunday evening."
                : "No plan for this week yet."}
        </p>
        {hasChecked && week === "this" && (
          <Button disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? "Planning…" : "Plan my week"}
          </Button>
        )}
      </div>
    </div>
  );
}
