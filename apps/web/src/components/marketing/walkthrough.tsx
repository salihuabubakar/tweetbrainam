"use client";

import { cn } from "@tweetbrainam/ui";
import { useEffect, useRef, useState } from "react";
import { AppFrame } from "./app-frame";
import { AnalysisScreen, ApprovalScreen, PlanScreen, VoiceScreen } from "./screens";

const ADVANCE_MS = 5000;

const steps = [
  {
    nav: "Today",
    title: "It reads your posts",
    body: "Connect X and we read what you've already published. No templates, no personas — your actual writing is the input.",
    screen: <AnalysisScreen />,
  },
  {
    nav: "Voice",
    title: "It learns how you sound",
    body: "Tone, sentence length, the phrases you use and the ones you'd never say. Every part is yours to correct, and your corrections outrank ours.",
    screen: <VoiceScreen />,
  },
  {
    nav: "Plan",
    title: "It plans your week",
    body: "A week of topics built around what you're actually working on, scheduled for the times you really post. Swap anything you don't like.",
    screen: <PlanScreen />,
  },
  {
    nav: "Drafts",
    title: "You approve every word",
    body: "Drafts arrive written in your voice. Edit them, rewrite them, or set them aside. Nothing reaches X without you saying yes.",
    screen: <ApprovalScreen />,
  },
];

export function Walkthrough() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const hasInteracted = useRef(false);

  useEffect(() => {
    if (isPaused || hasInteracted.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setTimeout(
      () => setActive((current) => (current + 1) % steps.length),
      ADVANCE_MS,
    );
    return () => clearTimeout(timer);
  }, [isPaused]);

  function choose(index: number) {
    hasInteracted.current = true;
    setActive(index);
  }

  const step = steps[active];
  if (!step) return null;

  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <ol className="flex flex-col gap-1">
        {steps.map((item, index) => (
          <li key={item.title}>
            <button
              type="button"
              aria-current={index === active ? "step" : undefined}
              onClick={() => choose(index)}
              className={cn(
                "flex w-full flex-col gap-1 rounded-lg border-l-2 py-3 pr-3 pl-4 text-left transition-colors",
                index === active
                  ? "border-primary bg-accent/40"
                  : "border-transparent hover:bg-accent/20",
              )}
            >
              <span
                className={cn(
                  "font-medium text-sm",
                  index === active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.title}
              </span>
              {index === active ? (
                <span className="text-muted-foreground text-sm leading-relaxed">{item.body}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      <div key={active} className="tb-screen-enter">
        <AppFrame active={step.nav}>{step.screen}</AppFrame>
      </div>
    </div>
  );
}
