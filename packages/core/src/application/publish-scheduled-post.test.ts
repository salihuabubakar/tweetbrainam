import { describe, expect, it } from "vitest";
import type { Draft, DraftStatus } from "../domain/drafting";
import type { PublishFailureReason, PublishStatus } from "../domain/publishing";
import { err, ok } from "../lib/result";
import type { DraftRepository } from "../ports/draft-repository";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { PlanRepository } from "../ports/plan-repository";
import type { ScheduleRepository, ScheduledPostWithContent } from "../ports/schedule-repository";
import type { XPublishClient } from "../ports/x-publish-client";
import { type PublishScheduledPostDeps, publishScheduledPost } from "./publish-scheduled-post";

type Options = {
  postStatus?: PublishStatus;
  draftStatus?: DraftStatus;
  segmentText?: string;
  failure?: PublishFailureReason;
  claimSucceeds?: boolean;
  hasToken?: boolean;
};

function makeDeps(options: Options = {}) {
  const statuses: { status: PublishStatus; reason?: PublishFailureReason }[] = [];
  const slotStatuses: string[] = [];
  let publishCalls = 0;

  const post: ScheduledPostWithContent = {
    id: "sp1",
    draftId: "d1",
    xAccountId: "acc-1",
    planSlotId: "slot-1",
    topic: "Shipping",
    publishAt: new Date("2026-08-10T09:00:00Z"),
    status: options.postStatus ?? "scheduled",
    xPostIds: options.postStatus === "published" ? ["999"] : [],
    failureReason: null,
    triggerRunId: null,
    segments: [{ text: options.segmentText ?? "A post worth publishing." }],
  };

  const draft: Draft = {
    id: "d1",
    planSlotId: "slot-1",
    status: options.draftStatus ?? "approved",
    currentVersion: {
      id: "v1",
      version: 1,
      segments: [{ text: options.segmentText ?? "A post worth publishing." }],
      author: "ai",
      createdAt: new Date(),
    },
  };

  const schedule: ScheduleRepository = {
    schedule: async () => {
      throw new Error("not used");
    },
    findById: async () => post,
    findByDraft: async () => post,
    listForAccount: async () => [post],
    setStatus: async (_id, status, detail) => {
      statuses.push(detail?.failureReason ? { status, reason: detail.failureReason } : { status });
    },
    setPublishAt: async () => {},
    setTriggerRunId: async () => {},
    claimForPublishing: async () => options.claimSucceeds ?? true,
  };

  const drafts = { findById: async () => draft } as unknown as DraftRepository;
  const plans = {
    updateSlotStatus: async (_id: string, status: string) => {
      slotStatuses.push(status);
    },
  } as unknown as PlanRepository;

  const recorded: string[] = [];

  const ingestion = {
    findAccessTokenForAccount: async () =>
      options.hasToken === false ? null : new TextEncoder().encode("token"),
    findUserIdForAccount: async () => "u1",
  } as unknown as IngestionRepository;

  const publisher: XPublishClient = {
    publishThread: async () => {
      publishCalls += 1;
      return options.failure
        ? err({
            reason: options.failure,
            detail: `X rejected: ${options.failure}`,
            publishedIdsBeforeFailure: [],
          })
        : ok({ xPostIds: ["111", "222"] });
    },
  };

  const deps: PublishScheduledPostDeps = {
    schedule,
    drafts,
    plans,
    ingestion,
    publisher,
    cipher: {
      encrypt: (plain) => new TextEncoder().encode(plain),
      decrypt: (data) => new TextDecoder().decode(data),
    },
    usage: {
      findSubscription: async () => ({
        planCode: "free_beta",
        status: "active",
        trialEndsAt: null,
      }),
      startTrial: async () => {},
      countUsage: async () => 0,
      countUsageByMetric: async () => ({
        draft_generated: 0,
        plan_generated: 0,
        post_published: 0,
      }),
      recordUsage: async (_userId, metric) => {
        recorded.push(metric);
      },
    },
    clock: { now: () => new Date("2026-08-10T09:00:00Z") },
  };

  return { deps, statuses, slotStatuses, recorded, getPublishCalls: () => publishCalls };
}

describe("publishScheduledPost", () => {
  it("publishes an approved draft and marks the slot published", async () => {
    const { deps, statuses, slotStatuses } = makeDeps();

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.xPostIds).toEqual(["111", "222"]);
    expect(statuses.at(-1)?.status).toBe("published");
    expect(slotStatuses).toEqual(["published"]);
  });

  it("counts a published post against the monthly allowance", async () => {
    const { deps, recorded } = makeDeps();

    await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(recorded).toEqual(["post_published"]);
  });

  it("does not count a post that failed to publish", async () => {
    const { deps, recorded } = makeDeps({ failure: "rate_limited" });

    await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(recorded).toEqual([]);
  });

  it("is idempotent — an already published post is never sent twice", async () => {
    const { deps, getPublishCalls } = makeDeps({ postStatus: "published" });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.alreadyPublished).toBe(true);
    expect(getPublishCalls()).toBe(0);
  });

  it("does not publish when another worker already claimed the post", async () => {
    const { deps, getPublishCalls } = makeDeps({ claimSucceeds: false });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(true);
    expect(getPublishCalls()).toBe(0);
  });

  it("refuses to publish a draft that is not approved", async () => {
    const { deps, getPublishCalls } = makeDeps({ draftStatus: "needs_review" });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("draft_not_approved");
    expect(getPublishCalls()).toBe(0);
  });

  it("never publishes a canceled post", async () => {
    const { deps, getPublishCalls } = makeDeps({ postStatus: "canceled" });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(false);
    expect(getPublishCalls()).toBe(0);
  });

  it("marks a rate limit as retryable", async () => {
    const { deps, statuses } = makeDeps({ failure: "rate_limited" });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(true);
    expect(statuses.at(-1)).toEqual({ status: "failed", reason: "rate_limited" });
  });

  it("does not retry a duplicate-content rejection", async () => {
    const { deps } = makeDeps({ failure: "duplicate_content" });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(false);
  });

  it("fails without retry when the X connection is gone", async () => {
    const { deps, statuses, getPublishCalls } = makeDeps({ hasToken: false });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(false);
    expect(statuses.at(-1)).toEqual({ status: "failed", reason: "connection_revoked" });
    expect(getPublishCalls()).toBe(0);
  });

  it("rejects content that exceeds the character limit before calling X", async () => {
    const { deps, getPublishCalls } = makeDeps({ segmentText: "a".repeat(281) });

    const result = await publishScheduledPost(deps, { scheduledPostId: "sp1" });

    expect(result.ok).toBe(false);
    expect(getPublishCalls()).toBe(0);
  });
});
