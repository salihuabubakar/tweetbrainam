"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type { ContentPlanValue, DraftValue } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 2500;
const MAX_SEGMENT_LENGTH = 280;

const NEEDS_ATTENTION_STATUSES = ["empty", "drafting", "ready"];

type ReviewState = "idle" | "generating" | "editing" | "saving";

export function DraftReviewer({ onApproved }: { onApproved?: () => void }) {
  const [slot, setSlot] = useState<ContentPlanValue["slots"][number] | null>(null);
  const [draft, setDraft] = useState<DraftValue | null>(null);
  const [state, setState] = useState<ReviewState>("idle");
  const {
    value: pendingEdit,
    setValue: setPendingEdit,
    clear: clearPendingEdit,
    isRestored,
  } = useDurableState<{ draftId: string; segments: string[] } | null>("drafts.pending-edit", null);
  const {
    value: guidance,
    setValue: setGuidance,
    clear: clearGuidance,
  } = useDurableState("drafts.guidance", "");
  const [error, setError] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);

  const segments = pendingEdit?.segments ?? [];
  const setSegments = (next: string[]) =>
    setPendingEdit({ draftId: draft?.id ?? "", segments: next });

  useEffect(() => {
    let cancelled = false;

    async function loadSlot() {
      const response = await fetch(`${apiUrl}/v1/plans/current`, { credentials: "include" });
      if (!response.ok || cancelled) return null;
      const body = (await response.json()) as { plan: ContentPlanValue | null };
      const next =
        body.plan?.slots.find((candidate) => NEEDS_ATTENTION_STATUSES.includes(candidate.status)) ??
        null;
      setSlot(next);
      return next;
    }

    async function loadDraft(slotId: string) {
      const response = await fetch(`${apiUrl}/v1/drafts?status=needs_review`, {
        credentials: "include",
      });
      if (!response.ok || cancelled) return;
      const body = (await response.json()) as { drafts: DraftValue[] };
      const match = body.drafts.find((candidate) => candidate.planSlotId === slotId) ?? null;
      setDraft((current) => {
        if (match) return match;
        return current && current.planSlotId === slotId ? current : null;
      });
      if (match) setState((current) => (current === "generating" ? "idle" : current));
    }

    async function poll() {
      const current = await loadSlot();
      if (current) await loadDraft(current.id);
      else setDraft(null);
    }

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isRestored || !draft) return;
    if (pendingEdit?.draftId === draft.id && pendingEdit.segments.length > 0) {
      setState((current) => (current === "idle" ? "editing" : current));
    }
  }, [isRestored, draft, pendingEdit]);

  async function requestDraft(note?: string) {
    if (!slot) return;
    setState("generating");
    setError(null);
    setDraft(null);
    await fetch(`${apiUrl}/v1/plans/slots/${slot.id}/draft`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(note ? { guidance: note } : {}),
    });
    setGuidance("");
  }

  async function saveEdits() {
    if (!draft) return;
    setState("saving");
    const response = await fetch(`${apiUrl}/v1/drafts/${draft.id}/content`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segments: segments.map((text) => ({ text })) }),
    });
    if (!response.ok) {
      setError("We couldn't save that. Check each post is 280 characters or fewer.");
      setState("editing");
      return;
    }
    const body = (await response.json()) as { draft: DraftValue };
    setDraft(body.draft);
    clearPendingEdit();
    setState("idle");
  }

  async function approve() {
    if (!draft) return;
    setState("saving");
    const response = await fetch(`${apiUrl}/v1/drafts/${draft.id}/approve`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      setError("We couldn't approve that draft.");
      setState("idle");
      return;
    }

    clearPendingEdit();
    clearGuidance();
    setDraft(null);
    setSlot(null);
    setJustApproved(true);
    setState("idle");
    onApproved?.();
  }

  if (!slot) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border border-dashed p-8 text-center">
        <p className="font-medium text-sm">
          {justApproved ? "Approved and scheduled" : "Nothing waiting on you"}
        </p>
        <p className="text-muted-foreground text-sm">
          {justApproved
            ? "It's queued for its slot. You can see it under Today."
            : "Every post in this week's plan has been handled."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4">
        <span className="font-medium text-sm">{slot.topic}</span>
        <span className="text-muted-foreground text-sm">{slot.angle}</span>
      </div>

      {!draft && state !== "generating" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border border-dashed py-10 text-center">
          <p className="text-muted-foreground text-sm">Ready to write this one in your voice.</p>
          <Button onClick={() => requestDraft()}>Write it</Button>
        </div>
      )}

      {state === "generating" && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
          Writing in your voice…
        </div>
      )}

      {draft?.currentVersion && state !== "generating" && (
        <div className="flex flex-col gap-3">
          {state === "editing" ? (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">
                Your changes are kept here even if you close this page.
              </p>
              {segments.map((text, index) => (
                <div
                  key={`${draft?.id ?? "draft"}-edit-${index.toString()}`}
                  className="flex flex-col gap-1"
                >
                  <textarea
                    value={text}
                    rows={4}
                    onChange={(event) => {
                      const next = [...segments];
                      next[index] = event.target.value;
                      setSegments(next);
                    }}
                    className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Post ${index + 1}`}
                  />
                  <span
                    className={cn(
                      "self-end text-xs tabular-nums",
                      text.length > MAX_SEGMENT_LENGTH
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {text.length}/{MAX_SEGMENT_LENGTH}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {draft.currentVersion.segments.map((segment, index) => (
                <li
                  key={`${draft.id}-${index}`}
                  className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm"
                >
                  {segment.text}
                </li>
              ))}
            </ol>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {state === "editing" ? (
              <>
                <Button disabled={state !== "editing"} onClick={saveEdits}>
                  Save changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearPendingEdit();
                    setState("idle");
                  }}
                >
                  Discard changes
                </Button>
              </>
            ) : (
              <>
                <Button className="flex-1" disabled={state === "saving"} onClick={approve}>
                  {state === "saving" ? "Working…" : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  disabled={state === "saving"}
                  onClick={() => {
                    setPendingEdit({
                      draftId: draft.id,
                      segments: draft.currentVersion?.segments.map((s) => s.text) ?? [],
                    });
                    setState("editing");
                  }}
                >
                  Edit
                </Button>
              </>
            )}
          </div>

          {state !== "editing" && (
            <div className="flex flex-col gap-2 rounded-lg border border-border border-dashed p-4">
              <label htmlFor="guidance" className="text-muted-foreground text-xs">
                Not right? Tell us what to change and we'll rewrite it.
              </label>
              <div className="flex gap-2">
                <input
                  id="guidance"
                  value={guidance}
                  onChange={(event) => setGuidance(event.target.value)}
                  placeholder="Too formal — make it blunter"
                  disabled={state === "saving"}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
                <Button
                  variant="outline"
                  disabled={state === "saving"}
                  onClick={() => requestDraft(guidance || undefined)}
                >
                  Rewrite
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
