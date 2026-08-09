"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import {
  type MemoryCategoryValue,
  type MemoryFactValue,
  memoryFactSchema,
} from "@tweetbrainam/contracts";
import { Button, cn } from "@tweetbrainam/ui";
import { useCallback, useEffect, useState } from "react";

const categoryLabels: Record<MemoryCategoryValue, string> = {
  project: "What you're building",
  audience: "Who you're writing for",
  expertise: "What you know",
  goal: "What you're aiming at",
  opinion: "What you argue",
  preference: "How you like to work",
};

const categoryOrder: MemoryCategoryValue[] = [
  "project",
  "goal",
  "audience",
  "expertise",
  "opinion",
  "preference",
];

function FactRow({
  fact,
  onArchive,
  onSave,
}: {
  fact: MemoryFactValue;
  onArchive: () => void;
  onSave: (content: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(fact.content);

  if (isEditing) {
    return (
      <li className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
        <textarea
          value={text}
          rows={2}
          onChange={(event) => setText(event.target.value)}
          className="rounded-md border border-border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={text.trim().length < 4}
            onClick={async () => {
              await onSave(text.trim());
              setIsEditing(false);
            }}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setText(fact.content);
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <span className="flex flex-col gap-0.5">
        <span>{fact.content}</span>
        {fact.source === "extracted" && fact.confidence < 0.7 ? (
          <span className="text-muted-foreground text-xs">
            We're not certain about this one — correct it or remove it.
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="text-muted-foreground hover:text-destructive"
        >
          Remove
        </button>
      </span>
    </li>
  );
}

export function MemoryProfile() {
  const [facts, setFacts] = useState<MemoryFactValue[] | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const {
    value: draft,
    setValue: setDraft,
    clear: clearDraft,
  } = useDurableState("memory.new-fact", {
    category: "project" as MemoryCategoryValue,
    content: "",
  });

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/v1/memory`, { credentials: "include" });
    if (!response.ok) {
      setFacts([]);
      return;
    }
    const body = (await response.json()) as { facts: unknown[] };
    const parsed = memoryFactSchema.array().safeParse(body.facts);
    setFacts(parsed.success ? parsed.data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addFact() {
    const content = draft.content.trim();
    if (content.length < 4) return;

    const response = await fetch(`${apiUrl}/v1/memory`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: draft.category, content }),
    });
    if (!response.ok) return;

    clearDraft();
    await load();
  }

  async function archive(factId: string) {
    await fetch(`${apiUrl}/v1/memory/${factId}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  async function save(factId: string, content: string) {
    await fetch(`${apiUrl}/v1/memory/${factId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    await load();
  }

  async function rebuild() {
    setIsRebuilding(true);
    await fetch(`${apiUrl}/v1/memory/rebuild`, { method: "POST", credentials: "include" });
    setTimeout(() => {
      void load();
      setIsRebuilding(false);
    }, 6000);
  }

  const grouped = categoryOrder
    .map((category) => ({
      category,
      items: (facts ?? []).filter((fact) => fact.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium text-sm">What we know about you</h2>
          <p className="text-muted-foreground text-sm">
            Voice is how you write. This is what you're writing about. It shapes which topics we
            plan and what your drafts can refer to.
          </p>
        </div>
        <Button variant="outline" disabled={isRebuilding} onClick={rebuild}>
          {isRebuilding ? "Reading your posts…" : "Re-read my posts"}
        </Button>
      </div>

      {facts === null ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : grouped.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing yet. Add what you're working on below, or let us read your posts.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((group) => (
            <div key={group.category} className="flex flex-col gap-2">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {categoryLabels[group.category]}
              </span>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((fact) => (
                  <FactRow
                    key={fact.id}
                    fact={fact}
                    onArchive={() => archive(fact.id)}
                    onSave={(content) => save(fact.id, content)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 border-border border-t pt-4">
        <span className="font-medium text-sm">Add something we should know</span>
        <div className="flex flex-wrap gap-2">
          {categoryOrder.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={draft.category === category}
              onClick={() => setDraft({ ...draft, category })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                draft.category === category
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={draft.content}
            placeholder="I'm building a scheduling tool for indie developers"
            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void addFact();
            }}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            variant="outline"
            disabled={draft.content.trim().length < 4}
            onClick={() => void addFact()}
          >
            Add
          </Button>
        </div>
      </div>
    </section>
  );
}
