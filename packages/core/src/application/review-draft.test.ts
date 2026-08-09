import { describe, expect, it } from "vitest";
import type { Draft, DraftSegment, DraftStatus } from "../domain/drafting";
import type { PublishStatus } from "../domain/publishing";
import type { DraftRepository, LearningSignalType } from "../ports/draft-repository";
import type { PlanRepository } from "../ports/plan-repository";
import type { ScheduleRepository } from "../ports/schedule-repository";
import { type ReviewDraftDeps, approveDraft, editDraft, rejectDraft } from "./review-draft";

function makeDeps(options: {
  status: DraftStatus;
  segments?: DraftSegment[];
  author?: "ai" | "user";
  existingSchedule?: PublishStatus;
}) {
  const statuses: DraftStatus[] = [];
  const slotStatuses: string[] = [];
  const signals: { type: LearningSignalType; payload: Record<string, unknown> }[] = [];
  const versions: { segments: DraftSegment[]; author: string }[] = [];

  const draft: Draft = {
    id: "d1",
    planSlotId: "slot-1",
    status: options.status,
    currentVersion: {
      id: "v1",
      version: 1,
      segments: options.segments ?? [{ text: "A reasonable post about shipping." }],
      author: options.author ?? "ai",
      createdAt: new Date("2026-08-06T12:00:00Z"),
    },
  };

  const drafts: DraftRepository = {
    findById: async () => draft,
    listForAccount: async () => [],
    findBySlot: async () => draft,
    createGenerating: async () => draft,
    addVersion: async (_id, segments, author) => {
      versions.push({ segments, author });
      return {
        ...draft,
        currentVersion: { id: "v2", version: 2, segments, author, createdAt: new Date() },
      };
    },
    setStatus: async (_id, status) => {
      statuses.push(status);
    },
    recordLearningSignal: async (input) => {
      signals.push({ type: input.type, payload: input.payload });
    },
    findAccountIdForDraft: async () => "acc-1",
  };

  const plans = {
    updateSlotStatus: async (_id: string, status: string) => {
      slotStatuses.push(status);
    },
    findSlotById: async () => ({
      id: "slot-1",
      topic: "Shipping",
      format: "single" as const,
      angle: "What we learned",
      targetAt: new Date("2026-08-10T09:00:00Z"),
      status: "ready" as const,
      position: 0,
    }),
  } as unknown as PlanRepository;

  const scheduled: { publishAt: Date }[] = [];
  const scheduleStatuses: string[] = [];

  const existing = options.existingSchedule
    ? {
        id: "sp1",
        draftId: "d1",
        publishAt: new Date("2026-08-10T09:00:00Z"),
        status: options.existingSchedule,
        xPostIds: [],
        failureReason: null,
        triggerRunId: "run_1",
      }
    : null;

  const schedule = {
    findByDraft: async () => existing,
    schedule: async (input: { publishAt: Date }) => {
      scheduled.push({ publishAt: input.publishAt });
      return {
        id: "sp1",
        draftId: "d1",
        publishAt: input.publishAt,
        status: "scheduled" as const,
        xPostIds: [],
        failureReason: null,
        triggerRunId: null,
      };
    },
    setPublishAt: async () => {},
    setTriggerRunId: async () => {},
    setStatus: async (_id: string, status: string) => {
      scheduleStatuses.push(status);
    },
  } as unknown as ScheduleRepository;

  const deps: ReviewDraftDeps = {
    drafts,
    plans,
    schedule,
    clock: { now: () => new Date("2026-08-06T12:00:00Z") },
  };
  return { deps, statuses, slotStatuses, signals, versions, scheduled, scheduleStatuses };
}

describe("approveDraft", () => {
  it("approves a draft awaiting review and marks its slot", async () => {
    const { deps, statuses, slotStatuses } = makeDeps({ status: "needs_review" });

    const result = await approveDraft(deps, { draftId: "d1" });

    expect(result.ok).toBe(true);
    expect(statuses).toEqual(["approved"]);
    expect(slotStatuses).toEqual(["approved"]);
  });

  it("refuses to approve a draft still being written", async () => {
    const { deps, statuses } = makeDeps({ status: "generating" });

    const result = await approveDraft(deps, { draftId: "d1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("draft_not_editable");
    expect(statuses).toEqual([]);
  });

  it("schedules the approved post at its planned slot time", async () => {
    const { deps, scheduled } = makeDeps({ status: "needs_review" });

    await approveDraft(deps, { draftId: "d1" });

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.publishAt.toISOString()).toBe("2026-08-10T09:00:00.000Z");
  });

  it("pushes a slot time that has already passed into the near future", async () => {
    const { deps, scheduled } = makeDeps({ status: "needs_review" });

    await approveDraft(deps, { draftId: "d1", publishAt: new Date("2026-08-01T09:00:00Z") });

    expect(scheduled[0]?.publishAt.getTime()).toBeGreaterThan(
      new Date("2026-08-06T12:00:00Z").getTime(),
    );
  });

  it("refuses to approve content over the character limit", async () => {
    const { deps } = makeDeps({ status: "needs_review", segments: [{ text: "a".repeat(281) }] });

    const result = await approveDraft(deps, { draftId: "d1" });

    expect(result.ok).toBe(false);
  });
});

describe("rejectDraft", () => {
  it("rejects a draft, frees the slot, and records why", async () => {
    const { deps, statuses, slotStatuses, signals } = makeDeps({ status: "needs_review" });

    const result = await rejectDraft(deps, { draftId: "d1", reason: "Not my opinion" });

    expect(result.ok).toBe(true);
    expect(statuses).toEqual(["rejected"]);
    expect(slotStatuses).toEqual(["empty"]);
    expect(signals[0]?.type).toBe("rejection");
    expect(signals[0]?.payload.reason).toBe("Not my opinion");
  });
});

describe("editDraft", () => {
  it("saves a user version and captures the diff as a learning signal", async () => {
    const { deps, versions, signals } = makeDeps({ status: "needs_review" });

    const result = await editDraft(deps, {
      draftId: "d1",
      segments: [{ text: "The way I would actually have said it." }],
    });

    expect(result.ok).toBe(true);
    expect(versions[0]?.author).toBe("user");
    expect(signals[0]?.type).toBe("edit_diff");
    expect(signals[0]?.payload).toHaveProperty("aiSegments");
    expect(signals[0]?.payload).toHaveProperty("userSegments");
  });

  it("does not record a learning signal when editing your own writing", async () => {
    const { deps, signals } = makeDeps({ status: "needs_review", author: "user" });

    await editDraft(deps, { draftId: "d1", segments: [{ text: "Another pass at my own words." }] });

    expect(signals).toEqual([]);
  });

  it("sends an approved draft back for review when edited", async () => {
    const { deps, statuses } = makeDeps({ status: "approved" });

    await editDraft(deps, { draftId: "d1", segments: [{ text: "Changed my mind about this." }] });

    expect(statuses).toEqual(["needs_review"]);
  });

  it("cancels the pending publish when an approved draft is edited", async () => {
    const { deps, scheduleStatuses } = makeDeps({
      status: "approved",
      existingSchedule: "scheduled",
    });

    await editDraft(deps, { draftId: "d1", segments: [{ text: "Changed my mind about this." }] });

    expect(scheduleStatuses).toEqual(["canceled"]);
  });

  it("leaves an already published post alone when the draft is edited", async () => {
    const { deps, scheduleStatuses } = makeDeps({
      status: "approved",
      existingSchedule: "published",
    });

    await editDraft(deps, { draftId: "d1", segments: [{ text: "Too late to change this." }] });

    expect(scheduleStatuses).toEqual([]);
  });

  it("refuses edits over the character limit", async () => {
    const { deps, versions } = makeDeps({ status: "needs_review" });

    const result = await editDraft(deps, { draftId: "d1", segments: [{ text: "a".repeat(281) }] });

    expect(result.ok).toBe(false);
    expect(versions).toEqual([]);
  });
});
