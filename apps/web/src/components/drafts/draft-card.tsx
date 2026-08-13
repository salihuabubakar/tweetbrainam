"use client";

import { readApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type { DraftListItemValue } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useState } from "react";

const MAX_SEGMENT_LENGTH = 280;

type CardState = "reading" | "editing" | "working";

function preview(draft: DraftListItemValue): string {
  const first = draft.currentVersion?.segments[0]?.text ?? "";
  return first.length > 140 ? `${first.slice(0, 140)}…` : first;
}

function whenLabel(draft: DraftListItemValue): string {
  if (!draft.targetAt) return "Not scheduled";
  return draft.targetAt.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DraftCard({
  draft,
  onChanged,
}: {
  draft: DraftListItemValue;
  onChanged: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<CardState>("reading");
  const [error, setError] = useState<string | null>(null);

  const {
    value: pending,
    setValue: setPending,
    clear: clearPending,
  } = useDurableState<string[] | null>(`drafts.edit.${draft.id}`, null);

  const original = draft.currentVersion?.segments.map((segment) => segment.text) ?? [];
  const segments = pending ?? original;
  const hasUnsaved = pending !== null && JSON.stringify(pending) !== JSON.stringify(original);
  const isTooLong = segments.some((text) => text.trim().length > MAX_SEGMENT_LENGTH);

  async function call(path: string, init: RequestInit, fallback: string) {
    setState("working");
    setError(null);
    const response = await fetch(`${apiUrl}${path}`, { credentials: "include", ...init });
    if (!response.ok) {
      setError(await readApiError(response, fallback));
      setState("reading");
      return false;
    }
    return true;
  }

  async function saveEdits() {
    const ok = await call(
      `/v1/drafts/${draft.id}/content`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ segments: segments.map((text) => ({ text: text.trim() })) }),
      },
      "We couldn't save that. Check each post is 280 characters or fewer.",
    );
    if (!ok) {
      setState("editing");
      return;
    }
    clearPending();
    setState("reading");
    onChanged();
  }

  async function approve() {
    const ok = await call(
      `/v1/drafts/${draft.id}/approve`,
      { method: "POST" },
      "We couldn't approve that draft.",
    );
    if (!ok) return;
    clearPending();
    onChanged();
  }

  async function reject() {
    const ok = await call(
      `/v1/drafts/${draft.id}/reject`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
      "We couldn't set that aside.",
    );
    if (!ok) return;
    clearPending();
    onChanged();
  }

  const isBusy = state === "working";

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col gap-1 text-left"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium text-sm">{draft.topic ?? "Untitled draft"}</span>
          <span className="text-muted-foreground text-xs">{whenLabel(draft)}</span>
          {draft.currentVersion && draft.currentVersion.segments.length > 1 ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              Thread · {draft.currentVersion.segments.length}
            </span>
          ) : null}
          {hasUnsaved ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs">Unsaved edits</span>
          ) : null}
        </div>
        {!isOpen ? <p className="text-muted-foreground text-sm">{preview(draft)}</p> : null}
      </button>

      {isOpen ? (
        <div className="flex flex-col gap-3">
          {state === "editing" ? (
            segments.map((text, index) => (
              <div key={`${draft.id}-${index}`} className="flex flex-col gap-1">
                <textarea
                  value={text}
                  rows={4}
                  onChange={(event) =>
                    setPending(
                      segments.map((existing, position) =>
                        position === index ? event.target.value : existing,
                      ),
                    )
                  }
                  className="rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span
                  className={cn(
                    "self-end text-xs tabular-nums",
                    text.trim().length > MAX_SEGMENT_LENGTH
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {text.trim().length}/{MAX_SEGMENT_LENGTH}
                </span>
              </div>
            ))
          ) : (
            <ol className="flex flex-col gap-2">
              {segments.map((text, index) => (
                <li
                  key={`${draft.id}-${index}`}
                  className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm"
                >
                  {text}
                </li>
              ))}
            </ol>
          )}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {state === "editing" ? (
              <>
                <Button disabled={isTooLong} onClick={saveEdits}>
                  Save changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearPending();
                    setState("reading");
                  }}
                >
                  Discard changes
                </Button>
              </>
            ) : (
              <>
                {draft.status === "needs_review" ? (
                  <Button disabled={isBusy} onClick={approve}>
                    {isBusy ? "Working…" : "Approve"}
                  </Button>
                ) : null}
                <Button variant="outline" disabled={isBusy} onClick={() => setState("editing")}>
                  Edit
                </Button>
                {draft.status === "needs_review" ? (
                  <Button variant="ghost" disabled={isBusy} onClick={reject}>
                    Set aside
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}
