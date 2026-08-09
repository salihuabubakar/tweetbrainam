"use client";

import { DraftReviewer } from "@/components/drafts/draft-reviewer";
import { apiUrl } from "@/lib/api-url";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FirstDraftStep() {
  const router = useRouter();
  const [hasApproved, setHasApproved] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function finish() {
    setIsBusy(true);
    await fetch(`${apiUrl}/v1/onboarding/advance`, { method: "POST", credentials: "include" });
    router.replace("/today");
    router.refresh();
  }

  if (hasApproved) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6">
          <span className="font-medium text-sm">That's your first post approved</span>
          <p className="text-muted-foreground text-sm">
            It's queued for its slot. From here we'll keep planning your weeks and writing drafts —
            you just approve them.
          </p>
        </div>
        <Button size="lg" disabled={isBusy} onClick={finish}>
          {isBusy ? "Working…" : "Finish setup"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DraftReviewer onApproved={() => setHasApproved(true)} />
      <Button variant="ghost" disabled={isBusy} onClick={finish}>
        Skip for now
      </Button>
    </div>
  );
}
