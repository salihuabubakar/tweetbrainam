import { describe, expect, it } from "vitest";
import type { Draft } from "../domain/drafting";
import { err, ok } from "../lib/result";
import type { AIProvider } from "../ports/ai-provider";
import type { DraftRepository } from "../ports/draft-repository";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { MemoryRepository } from "../ports/memory-repository";
import type { PlanRepository } from "../ports/plan-repository";
import type { UsageRepository } from "../ports/usage-repository";
import type { VoiceRepository } from "../ports/voice-repository";
import { type GenerateDraftDeps, generateDraft } from "./generate-draft";

const slot = {
  id: "slot-1",
  topic: "Shipping",
  format: "single" as const,
  angle: "What we learned",
  targetAt: new Date("2026-08-10T09:00:00Z"),
  status: "empty" as const,
  position: 0,
};

function makeDeps(
  options: { slotExists?: boolean; aiResult?: ReturnType<typeof ok> | ReturnType<typeof err> } = {},
) {
  const slotStatuses: string[] = [];
  const draftStatuses: string[] = [];
  const created: (string | null)[] = [];
  let promptTopic = "";

  const draft: Draft = { id: "d1", planSlotId: null, status: "generating", currentVersion: null };

  const drafts = {
    findBySlot: async () => null,
    createGenerating: async (_accountId: string, planSlotId: string | null) => {
      created.push(planSlotId);
      return { ...draft, planSlotId };
    },
    setStatus: async (_id: string, status: string) => {
      draftStatuses.push(status);
    },
    addVersion: async (_id: string, segments: { text: string }[]) => ({
      ...draft,
      currentVersion: {
        id: "v1",
        version: 1,
        segments,
        author: "ai" as const,
        createdAt: new Date(),
      },
    }),
    recordLearningSignal: async () => {},
  } as unknown as DraftRepository;

  const plans = {
    findSlotById: async () => (options.slotExists === false ? null : slot),
    updateSlotStatus: async (_id: string, status: string) => {
      slotStatuses.push(status);
    },
  } as unknown as PlanRepository;

  const deps = {
    drafts,
    plans,
    ingestion: {
      findAccountByUserId: async () => ({ id: "acc-1" }),
      findSimilarPosts: async () => [],
      findPostsMatchingTerms: async () => [],
    } as unknown as IngestionRepository,
    voice: {
      findActiveProfile: async () => ({
        id: "vp-1",
        traits: {
          tones: ["direct"],
          formality: 0.3,
          averageSentenceLength: "short",
          usesEmoji: false,
          usesHashtags: false,
          favouriteFormats: [],
          vocabularyQuirks: [],
          rules: [],
        },
        topics: [],
        sampleSentences: [],
      }),
    } as unknown as VoiceRepository,
    memory: { listForUser: async () => [] } as unknown as MemoryRepository,
    embeddings: null,
    usage: {
      findSubscription: async () => ({
        planCode: "free_beta" as const,
        status: "active" as const,
        trialEndsAt: null,
      }),
      startTrial: async () => {},
      countUsage: async () => 0,
      countUsageByMetric: async () => ({
        draft_generated: 0,
        plan_generated: 0,
        post_published: 0,
      }),
      recordUsage: async () => {},
    } satisfies UsageRepository,
    clock: { now: () => new Date("2026-08-06T12:00:00Z") },
    ai: {
      generateObject: async () =>
        options.aiResult ??
        ok({
          value: { segments: [{ text: "A post." }] },
          usage: { provider: "test", model: "m", inputTokens: 1, outputTokens: 1, latencyMs: 1 },
        }),
    } as unknown as AIProvider,
    buildRequest: (context: { topic: string }) => {
      promptTopic = context.topic;
      return { system: "s", prompt: "p", schema: {} as never };
    },
  } as unknown as GenerateDraftDeps;

  return { deps, slotStatuses, draftStatuses, created, getPromptTopic: () => promptTopic };
}

describe("generateDraft", () => {
  it("writes from a plan slot and moves the slot through drafting to ready", async () => {
    const { deps, slotStatuses, created, getPromptTopic } = makeDeps();

    const result = await generateDraft(deps, { userId: "u1", planSlotId: "slot-1" });

    expect(result.ok).toBe(true);
    expect(slotStatuses).toEqual(["drafting", "ready"]);
    expect(created).toEqual(["slot-1"]);
    expect(getPromptTopic()).toBe("Shipping");
  });

  it("writes from a brief with no plan slot", async () => {
    const { deps, created, getPromptTopic } = makeDeps();

    const result = await generateDraft(deps, {
      userId: "u1",
      brief: { topic: "Serverless", angle: "Local dev killed it", format: "thread" },
    });

    expect(result.ok).toBe(true);
    expect(getPromptTopic()).toBe("Serverless");
    expect(created).toEqual([null]);
  });

  it("touches no plan slot when writing outside the plan", async () => {
    const { deps, slotStatuses } = makeDeps();

    await generateDraft(deps, {
      userId: "u1",
      brief: { topic: "Serverless", angle: "Local dev killed it", format: "single" },
    });

    expect(slotStatuses).toEqual([]);
  });

  it("refuses when given neither a slot nor a brief", async () => {
    const { deps } = makeDeps();

    const result = await generateDraft(deps, { userId: "u1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation_failed");
  });

  it("reports a slot that no longer exists rather than writing something generic", async () => {
    const { deps } = makeDeps({ slotExists: false });

    const result = await generateDraft(deps, { userId: "u1", planSlotId: "gone" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });

  it("leaves the draft and slot generating on a non-final failed attempt so a retry is invisible", async () => {
    const { deps, slotStatuses, draftStatuses } = makeDeps({
      aiResult: err({ kind: "invalid_output", detail: "bad json" }),
    });

    const result = await generateDraft(deps, {
      userId: "u1",
      planSlotId: "slot-1",
      isFinalAttempt: false,
    });

    expect(result.ok).toBe(false);
    expect(slotStatuses).toEqual(["drafting"]);
    expect(draftStatuses).toEqual(["generating"]);
  });

  it("marks the draft and slot failed once the final attempt fails", async () => {
    const { deps, slotStatuses, draftStatuses } = makeDeps({
      aiResult: err({ kind: "invalid_output", detail: "bad json" }),
    });

    const result = await generateDraft(deps, {
      userId: "u1",
      planSlotId: "slot-1",
      isFinalAttempt: true,
    });

    expect(result.ok).toBe(false);
    expect(slotStatuses).toEqual(["drafting", "empty"]);
    expect(draftStatuses).toEqual(["generating", "failed"]);
  });

  it("defaults to treating a failure as final when the caller doesn't say otherwise", async () => {
    const { deps, slotStatuses, draftStatuses } = makeDeps({
      aiResult: err({ kind: "invalid_output", detail: "bad json" }),
    });

    await generateDraft(deps, { userId: "u1", planSlotId: "slot-1" });

    expect(slotStatuses).toEqual(["drafting", "empty"]);
    expect(draftStatuses).toEqual(["generating", "failed"]);
  });
});
