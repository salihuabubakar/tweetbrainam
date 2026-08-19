"use client";

import { type Tab, TabBar } from "@/components/shared/tab-bar";
import { useToast } from "@/components/shared/toast";
import { readApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type { ContentPlanValue, PlanSlotValue } from "@tweetbrainam/contracts";
import { Button } from "@tweetbrainam/ui";
import { useCallback, useEffect, useState } from "react";
import { AddSlot } from "./add-slot";
import { SlotCard } from "./slot-card";

const POLL_INTERVAL_MS = 3000;

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

type Week = "this" | "next";

type PlanResponse = {
  plan: ContentPlanValue | null;
  week: Week;
  weekStart: string;
};

const weekTabs: Tab<Week>[] = [
  { value: "this", label: "This week" },
  { value: "next", label: "Next week" },
];

export function WeekPlan({
  onReady,
  showWeekSwitcher = false,
}: {
  onReady?: (plan: ContentPlanValue) => void;
  showWeekSwitcher?: boolean;
}) {
  const toast = useToast();
  const { value: week, setValue: setWeek } = useDurableState<Week>("plan:week", "this");
  const [plan, setPlan] = useState<ContentPlanValue | null>(null);
  const [weekStart, setWeekStart] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/v1/plans/current?week=${week}`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const body = (await response.json()) as PlanResponse;

    setHasChecked(true);
    setPlan(body.plan);
    setWeekStart(body.weekStart);
    if (body.plan) {
      setIsGenerating(false);
      onReady?.(body.plan);
    }
  }, [onReady, week]);

  useEffect(() => {
    setPlan(null);
    setHasChecked(false);

    void load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    const response = await fetch(`${apiUrl}/v1/plans/generate`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setError(await readApiError(response, "We couldn't start planning your week."));
      setIsGenerating(false);
      return;
    }

    toast({
      message: "Planning your week — the slots will fill in here as they're decided.",
    });
  }

  const switcher = showWeekSwitcher ? (
    <TabBar tabs={weekTabs} active={week} onSelect={setWeek} label="Plan week" />
  ) : null;

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
                  <SlotCard key={slot.id} slot={slot} onChanged={load} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <AddSlot planId={plan.id} weekStart={weekStart} onAdded={load} />
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

        {error ? (
          <p role="alert" className="max-w-sm text-destructive text-sm">
            {error}
          </p>
        ) : null}

        {hasChecked && week === "this" && (
          <Button disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? "Planning…" : "Plan my week"}
          </Button>
        )}
      </div>
    </div>
  );
}
