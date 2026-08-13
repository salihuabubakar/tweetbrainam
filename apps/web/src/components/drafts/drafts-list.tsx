"use client";

import { TabBar } from "@/components/shared/tab-bar";
import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import {
  type DraftListItemValue,
  type DraftStatusValue,
  draftListItemSchema,
} from "@tweetbrainam/contracts";
import { useCallback, useEffect, useState } from "react";
import { ComposeDraft } from "./compose-draft";
import { DraftCard } from "./draft-card";

const POLL_INTERVAL_MS = 3000;

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

async function fetchDrafts(status: DraftStatusValue): Promise<DraftListItemValue[]> {
  const response = await fetch(`${apiUrl}/v1/drafts?status=${status}`, { credentials: "include" });
  if (!response.ok) return [];

  const body = (await response.json()) as { drafts: unknown[] };
  const parsed = draftListItemSchema.array().safeParse(body.drafts);
  return parsed.success ? parsed.data : [];
}

function WritingCard({ draft }: { draft: DraftListItemValue }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border border-dashed bg-card p-4">
      <span className="font-medium text-sm">{draft.topic ?? "Your post"}</span>
      <span className="text-muted-foreground text-sm">Writing it in your voice…</span>
    </li>
  );
}

export function DraftsList() {
  const { value: status, setValue: setStatus } = useDurableState<DraftStatusValue>(
    "drafts.status",
    "needs_review",
  );
  const [drafts, setDrafts] = useState<DraftListItemValue[] | null>(null);

  const isQueue = status === "needs_review";

  const load = useCallback(async () => {
    const [current, generating] = await Promise.all([
      fetchDrafts(status),
      isQueue ? fetchDrafts("generating") : Promise.resolve([]),
    ]);

    setDrafts([...generating, ...current]);
  }, [status, isQueue]);

  useEffect(() => {
    setDrafts(null);
    void load();

    if (!isQueue) return;

    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load, isQueue]);

  const active = tabs.find((tab) => tab.status === status) ?? tabs[0];

  return (
    <div className="flex flex-col gap-5">
      <ComposeDraft onQueued={load} />

      <TabBar
        tabs={tabs.map((tab) => ({ value: tab.status, label: tab.label }))}
        active={status}
        onSelect={setStatus}
        label="Draft status"
      />

      {drafts === null ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">{active?.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) =>
            draft.status === "generating" ? (
              <WritingCard key={draft.id} draft={draft} />
            ) : (
              <DraftCard key={draft.id} draft={draft} onChanged={load} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
