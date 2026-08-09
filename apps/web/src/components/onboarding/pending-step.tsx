"use client";

import { apiUrl } from "@/lib/api-url";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PendingStep({ note, action }: { note: string; action: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdvance() {
    setIsSubmitting(true);
    await fetch(`${apiUrl}/v1/onboarding/advance`, {
      method: "POST",
      credentials: "include",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border border-dashed bg-card p-6">
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground text-xs">
          Coming soon
        </span>
        <p className="text-muted-foreground text-sm">{note}</p>
      </div>
      <Button size="lg" disabled={isSubmitting} onClick={handleAdvance}>
        {isSubmitting ? "Working…" : action}
      </Button>
    </div>
  );
}
