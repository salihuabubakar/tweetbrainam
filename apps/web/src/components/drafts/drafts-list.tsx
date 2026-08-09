"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import {
  type DraftListItemValue,
  type DraftStatusValue,
  draftListItemSchema,
} from "@tweetbrainam/contracts";
import { cn } from "@tweetbrainam/ui";
import { useCallback, useEffect, useState } from "react";
import { DraftCard } from "./draft-card";

const tabs: { status: DraftStatusValue; label: string; empty: string }[] = [
  {
    status: "needs_review",
    label: "Needs review",
    empty: "Nothing waiting on you. We'll write the next one when its slot comes up.",
  },
  {
    status: "approved",
    label: "Approved",
    empty: "Nothing approved yet. Approved posts go out at their scheduled time.",
  },
  {
    status: "rejected",
    label: "Set aside",
    empty: "Nothing set aside.",
  },
];

export function DraftsList() {
  const { value: status, setValue: setStatus } = useDurableState<DraftStatusValue>(
    "drafts.status",
    "needs_review",
  );
  const [drafts, setDrafts] = useState<DraftListItemValue[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/v1/drafts?status=${status}`, {
      credentials: "include",
    });
    if (!response.ok) {
      setDrafts([]);
      return;
    }
    const body = (await response.json()) as { drafts: unknown[] };
    const parsed = draftListItemSchema.array().safeParse(body.drafts);
    setDrafts(parsed.success ? parsed.data : []);
  }, [status]);

  useEffect(() => {
    setDrafts(null);
    void load();
  }, [load]);

  const active = tabs.find((tab) => tab.status === status) ?? tabs[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex gap-1 self-start rounded-lg border border-border bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            type="button"
            aria-current={status === tab.status ? "true" : undefined}
            onClick={() => setStatus(tab.status)}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              status === tab.status
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {drafts === null ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">{active?.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  );
}
