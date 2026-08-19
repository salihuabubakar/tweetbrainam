"use client";

import { useDurableState } from "@/lib/durable-state";
import { useRouter } from "next/navigation";

export function ReplayTourButton() {
  const router = useRouter();
  const { setValue: setStep } = useDurableState<number | null>("tour.step", null);
  const { setValue: setIsDone } = useDurableState("tour.done", false);

  return (
    <button
      type="button"
      onClick={() => {
        setIsDone(false);
        setStep(0);
        router.push("/today");
      }}
      className="self-start text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
    >
      Replay the tour
    </button>
  );
}
