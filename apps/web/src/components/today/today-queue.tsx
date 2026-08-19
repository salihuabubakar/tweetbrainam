"use client";

import { useToast } from "@/components/shared/toast";
import { apiUrl } from "@/lib/api-url";
import { Button, cn } from "@tweetbrainam/ui";
import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 5000;

type ScheduledPost = {
  id: string;
  draftId: string;
  publishAt: string;
  status: "scheduled" | "publishing" | "published" | "failed" | "canceled";
  xPostIds: string[];
  failureReason: string | null;
  topic: string | null;
  segments: { text: string }[];
};

const statusLabels: Record<ScheduledPost["status"], string> = {
  scheduled: "Scheduled",
  publishing: "Publishing…",
  published: "Published",
  failed: "Failed",
  canceled: "Canceled",
};

const failureMessages: Record<string, string> = {
  connection_revoked: "Your X connection expired. Reconnect your account and try again.",
  rate_limited: "X asked us to slow down. We'll retry shortly.",
  duplicate_content: "X rejected this as a duplicate of something you already posted.",
  content_rejected: "X refused to publish this post.",
  unknown: "Something went wrong while publishing.",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const actionResults: Record<string, { done: string; failed: string }> = {
  cancel: {
    done: "Canceled — it won't go out. The draft is still in Drafts if you want it back.",
    failed: "We couldn't cancel that. It's still scheduled.",
  },
  "publish-now": {
    done: "Publishing now — this takes a few seconds. It'll show as Published when X confirms.",
    failed: "We couldn't start publishing. Nothing was sent to X.",
  },
  retry: {
    done: "Retrying — we'll update this card when X responds.",
    failed: "We couldn't retry that just now.",
  },
};

const busyLabels: Record<string, string> = {
  cancel: "Canceling…",
  "publish-now": "Publishing…",
  retry: "Retrying…",
};

function PostCard({ post, onAction }: { post: ScheduledPost; onAction: () => void }) {
  const toast = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const isBusy = busyAction !== null;

  async function act(path: string) {
    setBusyAction(path);
    try {
      const response = await fetch(`${apiUrl}/v1/schedule/${post.id}/${path}`, {
        method: "POST",
        credentials: "include",
      });
      const copy = actionResults[path];
      if (copy) {
        toast(response.ok ? { message: copy.done } : { message: copy.failed, tone: "error" });
      }
    } finally {
      setBusyAction(null);
      onAction();
    }
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4",
        post.status === "failed" ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-sm">{post.topic ?? "Post"}</span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {formatWhen(post.publishAt)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {post.segments.map((segment, index) => (
          <p
            key={`${post.id}-${index.toString()}`}
            className="whitespace-pre-wrap text-muted-foreground text-sm"
          >
            {segment.text}
          </p>
        ))}
      </div>

      {post.status === "failed" && post.failureReason && (
        <p className="text-destructive text-sm">
          {failureMessages[post.failureReason] ?? failureMessages.unknown}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            post.status === "published"
              ? "bg-accent"
              : post.status === "failed"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
          )}
        >
          {statusLabels[post.status]}
        </span>

        {post.status === "published" && post.xPostIds[0] && (
          <a
            href={`https://x.com/i/status/${post.xPostIds[0]}`}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground text-xs underline underline-offset-2 hover:text-foreground"
          >
            View on X
          </a>
        )}

        <div className="ml-auto flex gap-2">
          {post.status === "scheduled" && (
            <>
              <Button size="sm" variant="outline" disabled={isBusy} onClick={() => act("cancel")}>
                {busyAction === "cancel" ? busyLabels.cancel : "Cancel"}
              </Button>
              <Button size="sm" disabled={isBusy} onClick={() => act("publish-now")}>
                {busyAction === "publish-now" ? busyLabels["publish-now"] : "Publish now"}
              </Button>
            </>
          )}
          {post.status === "failed" && (
            <Button size="sm" disabled={isBusy} onClick={() => act("retry")}>
              {busyAction === "retry" ? busyLabels.retry : "Try again"}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export function TodayQueue() {
  const [posts, setPosts] = useState<ScheduledPost[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/v1/schedule`, { credentials: "include" });
    if (!response.ok) return;
    const body = (await response.json()) as { posts: ScheduledPost[] };
    setPosts(body.posts);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (posts === null) {
    return <p className="text-muted-foreground text-sm">Checking what's queued…</p>;
  }

  const upcoming = posts.filter(
    (post) => post.status === "scheduled" || post.status === "publishing",
  );
  const needsAttention = posts.filter((post) => post.status === "failed");
  const recentlyPublished = posts
    .filter((post) => post.status === "published")
    .slice(-5)
    .reverse();

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border border-dashed py-16 text-center">
        <p className="font-medium text-sm">Nothing queued yet</p>
        <p className="text-muted-foreground text-sm">
          Approve a draft and it will appear here, scheduled for its slot.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {needsAttention.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-sm">Needs your attention</h2>
          <ul className="flex flex-col gap-2">
            {needsAttention.map((post) => (
              <PostCard key={post.id} post={post} onAction={() => void load()} />
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing scheduled right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((post) => (
              <PostCard key={post.id} post={post} onAction={() => void load()} />
            ))}
          </ul>
        )}
      </section>

      {recentlyPublished.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-sm">Recently published</h2>
          <ul className="flex flex-col gap-2">
            {recentlyPublished.map((post) => (
              <PostCard key={post.id} post={post} onAction={() => void load()} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
