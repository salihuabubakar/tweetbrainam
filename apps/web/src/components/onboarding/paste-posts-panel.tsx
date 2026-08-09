"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const MIN_POSTS = 25;

function countPosts(raw: string): number {
  return raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length >= 40 && !block.startsWith("RT @")).length;
}

export function PastePostsPanel({
  postsNeeded = MIN_POSTS,
  onImported,
}: {
  postsNeeded?: number;
  onImported: () => void;
}) {
  const router = useRouter();
  const {
    value: raw,
    setValue: setRaw,
    clear: clearRaw,
    isRestored,
  } = useDurableState("onboarding.pasted-posts", "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detected = useMemo(() => countPosts(raw), [raw]);

  async function handleImport() {
    setIsSaving(true);
    setError(null);
    const response = await fetch(`${apiUrl}/v1/onboarding/import-posts`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    setIsSaving(false);
    if (!response.ok) {
      setError("We couldn't read those posts. Check the format and try again.");
      return;
    }
    clearRaw();
    onImported();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">Paste your posts instead</span>
        <p className="text-muted-foreground text-sm">
          Open your X profile, copy your recent posts, and paste them below — one post per block,
          separated by a blank line. Aim for {postsNeeded} or more so we learn your voice properly.
        </p>
      </div>

      <textarea
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        rows={10}
        placeholder={"Your first post goes here.\n\nYour second post goes here.\n\nAnd so on."}
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Paste your posts"
      />

      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-xs tabular-nums">
          {isRestored && detected > 0 ? "Saved as you type · " : ""}
          {detected} {detected === 1 ? "post" : "posts"} detected
          {detected > 0 && detected < postsNeeded
            ? ` · ${postsNeeded - detected} more recommended`
            : ""}
        </span>
        <Button disabled={detected === 0 || isSaving} onClick={handleImport}>
          {isSaving ? "Saving…" : "Use these posts"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
