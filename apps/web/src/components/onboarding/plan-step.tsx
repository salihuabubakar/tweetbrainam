"use client";

import { WeekPlan } from "@/components/plan/week-plan";
import { apiUrl } from "@/lib/api-url";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlanStep() {
  const router = useRouter();
  const [hasPlan, setHasPlan] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function handleContinue() {
    setIsBusy(true);
    await fetch(`${apiUrl}/v1/onboarding/advance`, { method: "POST", credentials: "include" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <WeekPlan onReady={() => setHasPlan(true)} />

      {hasPlan && (
        <p className="text-muted-foreground text-xs">
          Nothing here is fixed. You can swap topics, change times, or skip a slot entirely from the
          Plan page.
        </p>
      )}

      <Button size="lg" disabled={!hasPlan || isBusy} onClick={handleContinue}>
        {isBusy ? "Working…" : "This looks good"}
      </Button>
    </div>
  );
}
