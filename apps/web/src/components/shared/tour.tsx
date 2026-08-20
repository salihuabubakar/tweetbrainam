"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import { TOUR_STEPS } from "@/lib/tour";
import { Button } from "@tweetbrainam/ui";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";

const ANCHOR_POLL_MS = 120;
const SCROLL_SETTLE_MS = 320;
const POPOVER_WIDTH = 320;
const GAP = 12;

type Box = { top: number; left: number; width: number; height: number };

const toBox = (rect: DOMRect): Box => ({
  top: rect.top,
  left: rect.left,
  width: rect.width,
  height: rect.height,
});

// Completion lives on the user record, not in local storage: signing out clears
// durable state, which used to replay the whole tour on every sign-in.
export function Tour({ hasSeenTour }: { hasSeenTour: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    value: step,
    setValue: setStep,
    isRestored,
  } = useDurableState<number | null>("tour.step", null);
  const [box, setBox] = useState<Box | null>(null);
  const titleId = useId();

  const current = step === null ? null : TOUR_STEPS[step];
  const isLast = step !== null && step === TOUR_STEPS.length - 1;

  const finish = useCallback(() => {
    setStep(null);
    setBox(null);
    void fetch(`${apiUrl}/v1/me/tour`, { method: "POST", credentials: "include" }).then(() =>
      router.refresh(),
    );
  }, [setStep, router]);

  // Starts itself the first time someone lands on Today, which can only happen
  // once onboarding is finished.
  useEffect(() => {
    if (!isRestored || hasSeenTour || step !== null) return;
    if (pathname !== "/today") return;
    setStep(0);
  }, [isRestored, hasSeenTour, step, pathname, setStep]);

  useEffect(() => {
    if (!current || pathname === current.route) return;
    router.push(current.route);
  }, [current, pathname, router]);

  // The anchor may not exist yet: the route is still resolving, or the page is
  // waiting on its own fetch. Poll until it appears rather than giving up.
  useEffect(() => {
    if (!current || pathname !== current.route) {
      setBox(null);
      return;
    }

    let cancelled = false;
    let pollTimer = 0;
    let settleTimer = 0;

    const locate = () => {
      if (cancelled) return;
      const element = document.querySelector(`[data-tour="${current.anchor}"]`);

      if (!element) {
        pollTimer = window.setTimeout(locate, ANCHOR_POLL_MS);
        return;
      }

      element.scrollIntoView({ block: "center", behavior: "smooth" });
      settleTimer = window.setTimeout(() => {
        if (!cancelled) setBox(toBox(element.getBoundingClientRect()));
      }, SCROLL_SETTLE_MS);
    };

    locate();

    const remeasure = () => {
      const element = document.querySelector(`[data-tour="${current.anchor}"]`);
      if (element) setBox(toBox(element.getBoundingClientRect()));
    };

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearTimeout(settleTimer);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [current, pathname]);

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, finish]);

  if (!current || !box || step === null) return null;

  const spaceBelow = window.innerHeight - (box.top + box.height);
  const placeBelow = spaceBelow > 220;
  const left = Math.min(
    Math.max(GAP, box.left + box.width / 2 - POPOVER_WIDTH / 2),
    window.innerWidth - POPOVER_WIDTH - GAP,
  );

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200"
        style={{
          top: box.top - 4,
          left: box.left - 4,
          width: box.width + 8,
          height: box.height + 8,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        }}
      />

      {/* Not a dialog: the page behind stays live and focus is not trapped, so
          claiming aria-modal would tell assistive tech something untrue. */}
      <section
        aria-labelledby={titleId}
        className="absolute flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xl"
        style={{
          width: POPOVER_WIDTH,
          left,
          ...(placeBelow
            ? { top: box.top + box.height + GAP }
            : { top: Math.max(GAP, box.top - GAP - 220) }),
        }}
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="font-medium text-sm">
            {current.title}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{current.body}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {step + 1} of {TOUR_STEPS.length}
          </span>

          <div className="ml-auto flex gap-2">
            {step > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={finish}>
                Skip
              </Button>
            )}
            <Button size="sm" onClick={() => (isLast ? finish() : setStep(step + 1))}>
              {isLast ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
