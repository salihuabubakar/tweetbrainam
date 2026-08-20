"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReplayTourButton() {
  const router = useRouter();
  const { setValue: setStep } = useDurableState<number | null>("tour.step", null);
  const [isBusy, setIsBusy] = useState(false);

  async function replay() {
    setIsBusy(true);
    await fetch(`${apiUrl}/v1/me/tour`, { method: "DELETE", credentials: "include" });
    setStep(0);
    router.push("/today");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={replay}
      className="self-start text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground disabled:opacity-50"
    >
      {isBusy ? "Starting…" : "Replay the tour"}
    </button>
  );
}
