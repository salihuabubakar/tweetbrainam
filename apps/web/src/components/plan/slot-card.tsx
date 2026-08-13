"use client";

import { readApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-url";
import type { PlanSlotValue, PostFormatValue } from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useState } from "react";

const statusLabels: Record<PlanSlotValue["status"], string> = {
  empty: "Not drafted",
  drafting: "Writing…",
  ready: "Ready to review",
  approved: "Approved",
  published: "Published",
  skipped: "Skipped",
};

const COMMITTED: PlanSlotValue["status"][] = ["approved", "published"];

function timeOfDayLabel(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Midday";
  return "Evening";
}

export function SlotCard({ slot, onChanged }: { slot: PlanSlotValue; onChanged: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ topic: slot.topic, angle: slot.angle, format: slot.format });

  const date = new Date(slot.targetAt);
  const isCommitted = COMMITTED.includes(slot.status);
  const canEdit = !isCommitted;

  async function call(path: string, init: RequestInit) {
    setIsBusy(true);
    setError(null);
    const response = await fetch(`${apiUrl}${path}`, { credentials: "include", ...init });
    setIsBusy(false);

    if (!response.ok) {
      setError(await readApiError(response, "That didn't work."));
      return false;
    }
    return true;
  }

  async function save() {
    const ok = await call(`/v1/plans/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: form.topic.trim(),
        angle: form.angle.trim(),
        format: form.format,
      }),
    });
    if (!ok) return;
    setIsEditing(false);
    onChanged();
  }

  async function act(path: string, method = "POST") {
    const ok = await call(path, { method });
    if (ok) onChanged();
  }

  async function requestDraft() {
    const ok = await call(`/v1/plans/slots/${slot.id}/draft`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (ok) onChanged();
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-3 rounded-lg border border-primary bg-card p-4">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`topic-${slot.id}`}>
          Topic
          <input
            id={`topic-${slot.id}`}
            value={form.topic}
            onChange={(event) => setForm({ ...form, topic: event.target.value })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor={`angle-${slot.id}`}>
          The point to make
          <textarea
            id={`angle-${slot.id}`}
            value={form.angle}
            rows={3}
            onChange={(event) => setForm({ ...form, angle: event.target.value })}
            className="rounded-md border border-border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <div className="flex gap-2">
          {(["single", "thread"] as PostFormatValue[]).map((format) => (
            <button
              key={format}
              type="button"
              aria-pressed={form.format === format}
              onClick={() => setForm({ ...form, format })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                form.format === format
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              {format === "single" ? "Single post" : "Thread"}
            </button>
          ))}
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isBusy || form.topic.trim().length < 3 || form.angle.trim().length < 10}
            onClick={save}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={() => {
              setForm({ topic: slot.topic, angle: slot.angle, format: slot.format });
              setIsEditing(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-4",
        slot.status === "skipped" && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="font-medium">{timeOfDayLabel(date)}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">
          {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      <span className="font-medium text-sm">{slot.topic}</span>
      <p className="text-muted-foreground text-sm">{slot.angle}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs">
          {slot.format === "thread" ? "Thread" : "Single post"}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            slot.status === "empty" ? "bg-muted text-muted-foreground" : "bg-accent",
          )}
        >
          {statusLabels[slot.status]}
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {isCommitted ? (
        <p className="text-muted-foreground text-xs">
          Already {slot.status}. Change it from Today.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 text-xs">
          {slot.status === "skipped" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => act(`/v1/plans/slots/${slot.id}/restore`)}
              className="text-muted-foreground hover:text-foreground"
            >
              Put it back
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isBusy || !canEdit}
                onClick={() => setIsEditing(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                Change topic
              </button>
              <button
                type="button"
                disabled={isBusy || slot.status === "drafting"}
                onClick={requestDraft}
                className="text-muted-foreground hover:text-foreground"
              >
                {slot.status === "ready" ? "Write it again" : "Write it now"}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => act(`/v1/plans/slots/${slot.id}/skip`)}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip this week
              </button>
            </>
          )}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => act(`/v1/plans/slots/${slot.id}`, "DELETE")}
            className="text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}
