"use client";

import { apiUrl } from "@/lib/api-url";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PastePostsPanel } from "./paste-posts-panel";

type AnalysisStatus = {
  state: "pending" | "in_progress" | "ready" | "insufficient_posts" | "failed";
  postsAnalyzed: number;
  postsNeeded: number;
  failureReason: string | null;
  message: string | null;
  canRetry: boolean;
};

const POLL_INTERVAL_MS = 3000;
const STALL_AFTER_MS = 90_000;

export function AnalyzingStep() {
  const router = useRouter();
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [hasStalled, setHasStalled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [hasImported, setHasImported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      const response = await fetch(`${apiUrl}/v1/onboarding/analysis-status`, {
        credentials: "include",
      });
      if (!response.ok || cancelled) return;
      const next = (await response.json()) as AnalysisStatus;
      setStatus(next);
      if (next.state === "pending" || next.state === "in_progress") {
        setHasStalled(Date.now() - startedAt > STALL_AFTER_MS);
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function callAndRefresh(path: string) {
    setIsBusy(true);
    await fetch(`${apiUrl}${path}`, { method: "POST", credentials: "include" });
    router.refresh();
  }

  const analyzed = status?.postsAnalyzed ?? 0;
  const needed = status?.postsNeeded ?? 0;
  const progress = needed === 0 ? 0 : Math.min(100, Math.round((analyzed / needed) * 100));
  const hasFailed = status?.state === "failed";
  const canContinue = status?.state === "ready" || status?.state === "insufficient_posts";

  const headline = hasImported
    ? "Your posts are in"
    : hasFailed
      ? "We couldn't finish reading your posts"
      : status?.state === "ready"
        ? "Analysis complete"
        : status?.state === "insufficient_posts"
          ? "We found fewer posts than expected"
          : "Reading your posts…";

  const detail = hasImported
    ? "We're reading through them now to learn how you write."
    : hasFailed
      ? status?.message
      : status?.state === "ready"
        ? "We've learned enough to build your voice profile."
        : status?.state === "insufficient_posts"
          ? `We could only read ${analyzed} of your posts. We'll still build a profile, but it will be rougher — you can correct it in the next step.`
          : hasStalled
            ? "This is taking longer than usual. You can keep waiting, or try again."
            : "This usually takes a minute or two. Keep this page open and we'll update it as we go.";

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex flex-col gap-4 rounded-lg border bg-card p-6 ${
          hasFailed ? "border-destructive/40" : "border-border"
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-sm">{headline}</span>
          {!hasFailed && (
            <span className="text-muted-foreground text-sm tabular-nums">
              {analyzed} {analyzed === 1 ? "post" : "posts"}
            </span>
          )}
        </div>

        {!hasFailed && (
          <progress
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
            value={progress}
            max={100}
            aria-label="Analysis progress"
          >
            {progress}%
          </progress>
        )}

        <p className={`text-sm ${hasFailed ? "text-foreground" : "text-muted-foreground"}`}>
          {detail}
        </p>
      </div>

      {!hasImported && (hasFailed || status?.state === "insufficient_posts") && (
        <PastePostsPanel postsNeeded={needed} onImported={() => setHasImported(true)} />
      )}

      <div className="flex gap-2">
        {!hasImported && (hasFailed || hasStalled) && status?.canRetry !== false && (
          <Button
            variant="outline"
            size="lg"
            disabled={isBusy}
            onClick={() => callAndRefresh("/v1/onboarding/retry-analysis")}
          >
            Try again
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          disabled={(!canContinue && !hasFailed) || isBusy}
          onClick={() => callAndRefresh("/v1/onboarding/advance")}
        >
          {hasFailed ? "Continue without analysis" : "See what we learned"}
        </Button>
      </div>
    </div>
  );
}
