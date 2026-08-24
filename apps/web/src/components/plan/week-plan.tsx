"use client";

import { useToast } from "@/components/shared/toast";
import { readApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-url";
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

type PlanResponse = {
  plan: ContentPlanValue | null;
  weekStart: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Computed in the browser's own timezone and sent explicitly, so what the user
// sees labelled as a week is exactly the week the server reads.
function mondayOf(date: Date): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return toIsoDate(copy);
}

function shiftWeeks(weekStart: string, weeks: number): string {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + weeks * 7);
  return toIsoDate(date);
}

function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const day = (date: Date) =>
    date.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return `${day(start)} – ${day(end)}`;
}

function relativeLabel(weekStart: string, currentWeek: string): string | null {
  if (weekStart === currentWeek) return "This week";
  if (weekStart === shiftWeeks(currentWeek, 1)) return "Next week";
  if (weekStart === shiftWeeks(currentWeek, -1)) return "Last week";
  return null;
}

export function WeekPlan({
  onReady,
  showWeekSwitcher = false,
}: {
  onReady?: (plan: ContentPlanValue) => void;
  showWeekSwitcher?: boolean;
}) {
  const toast = useToast();
  // Deliberately not durable: coming back days later should land on the current
  // week, not on whichever week was last being browsed.
  const [currentWeek] = useState(() => mondayOf(new Date()));
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [plan, setPlan] = useState<ContentPlanValue | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPast = weekStart < currentWeek;

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/v1/plans/current?weekStart=${weekStart}`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const body = (await response.json()) as PlanResponse;

    setHasChecked(true);
    setPlan(body.plan);
    if (body.plan) {
      setIsGenerating(false);
      onReady?.(body.plan);
    }
  }, [onReady, weekStart]);

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

    const response = await fetch(`${apiUrl}/v1/plans/generate?weekStart=${weekStart}`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setError(await readApiError(response, "We couldn't start planning your week."));
      setIsGenerating(false);
      return;
    }

    toast({
      message: `Planning ${weekLabel(weekStart)} — the slots will fill in here as they're decided.`,
    });
  }

  const relative = relativeLabel(weekStart, currentWeek);

  const switcher = showWeekSwitcher ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-label="Previous week"
        onClick={() => setWeekStart(shiftWeeks(weekStart, -1))}
      >
        ←
      </Button>

      <div className="flex flex-1 flex-col items-center">
        <span className="font-medium text-sm">{relative ?? weekLabel(weekStart)}</span>
        {relative ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {weekLabel(weekStart)}
          </span>
        ) : null}
      </div>

      <Button
        variant="outline"
        size="sm"
        aria-label="Next week"
        onClick={() => setWeekStart(shiftWeeks(weekStart, 1))}
      >
        →
      </Button>

      {weekStart !== currentWeek ? (
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(currentWeek)}>
          Today
        </Button>
      ) : null}
    </div>
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

        {isPast ? null : <AddSlot planId={plan.id} weekStart={weekStart} onAdded={load} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {switcher}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border border-dashed py-12 text-center">
        <p className="text-muted-foreground text-sm">
          {isGenerating
            ? "Choosing what you should write about…"
            : !hasChecked
              ? "Checking your plan…"
              : isPast
                ? "Nothing was planned for this week."
                : relative === "Next week"
                  ? "Next week isn't planned yet. We put it together on Sunday evening — or you can do it now."
                  : "No plan for this week yet."}
        </p>

        {error ? (
          <p role="alert" className="max-w-sm text-destructive text-sm">
            {error}
          </p>
        ) : null}

        {hasChecked && !isPast && (
          <Button disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating
              ? "Planning…"
              : relative === "Next week"
                ? "Plan next week"
                : "Plan my week"}
          </Button>
        )}
      </div>
    </div>
  );
}
