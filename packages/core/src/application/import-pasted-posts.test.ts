import { describe, expect, it } from "vitest";
import type { IngestablePost } from "../domain/ingestion";
import type { IngestionAccount, IngestionRepository } from "../ports/ingestion-repository";
import { type ImportPastedPostsDeps, importPastedPosts } from "./import-pasted-posts";

const account: IngestionAccount = {
  id: "acc-1",
  xUserId: "x-1",
  accessTokenEnc: new TextEncoder().encode("token"),
  lastIngestedPostId: null,
  analysisState: "idle",
  analysisFailureReason: null,
};

function makeDeps(existing: IngestionAccount | null = account) {
  const saved: IngestablePost[] = [];
  const voiceBuilds: string[] = [];

  const ingestion: IngestionRepository = {
    findAccountByUserId: async () => existing,
    saveIngestedPosts: async (_id, items) => {
      saved.push(...items);
      return items.length;
    },
    updateIngestionWatermark: async () => {},
    countIngestedPosts: async () => saved.length,
    findAccessTokenForAccount: async () => null,
    findUserIdForAccount: async () => "u1",
    listPostsMissingEmbedding: async () => [],
    saveEmbeddings: async () => {},
    findSimilarPosts: async () => [],
    findPostsMatchingTerms: async () => [],
    setAnalysisState: async () => {},
  };

  const deps: ImportPastedPostsDeps = {
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
      recordUsage: async () => {},
    },
    clock: { now: () => new Date("2026-08-06T12:00:00Z") },
    ingestion,
    jobs: {
      startVoiceProfileBuild: async (userId) => {
        voiceBuilds.push(userId);
      },
    },
  };

  return { deps, saved, voiceBuilds };
}

const raw = [
  "A properly substantial post that reveals how this person actually writes.",
  "Another post with enough words in it to be worth learning a voice from.",
].join("\n\n");

describe("importPastedPosts", () => {
  it("starts the voice profile build after storing pasted posts", async () => {
    const { deps, saved, voiceBuilds } = makeDeps();

    const result = await importPastedPosts(deps, { userId: "u1", raw, maxPosts: 100 });

    expect(result.ok).toBe(true);
    expect(saved).toHaveLength(2);
    expect(voiceBuilds).toEqual(["u1"]);
  });

  it("does not start the voice profile build when nothing parsed", async () => {
    const { deps, voiceBuilds } = makeDeps();

    const result = await importPastedPosts(deps, { userId: "u1", raw: "too short", maxPosts: 100 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ingestion_failed");
    expect(voiceBuilds).toEqual([]);
  });

  it("does not start the voice profile build when no account is connected", async () => {
    const { deps, voiceBuilds } = makeDeps(null);

    const result = await importPastedPosts(deps, { userId: "u1", raw, maxPosts: 100 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("x_connection_revoked");
    expect(voiceBuilds).toEqual([]);
  });
});
