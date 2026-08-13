import { describe, expect, it } from "vitest";
import type { AnalysisFailureReason, AnalysisState, IngestablePost } from "../domain/ingestion";
import { err, ok } from "../lib/result";
import type { IngestionAccount, IngestionRepository } from "../ports/ingestion-repository";
import type { FetchFailure } from "../ports/x-content-client";
import { type IngestAccountPostsDeps, ingestAccountPosts } from "./ingest-account-posts";

const account: IngestionAccount = {
  id: "acc-1",
  xUserId: "x-1",
  accessTokenEnc: new TextEncoder().encode("token"),
  lastIngestedPostId: "100",
  analysisState: "idle",
  analysisFailureReason: null,
};

const makePost = (id: string, text: string): IngestablePost => ({
  xPostId: id,
  type: "post",
  source: "x_api",
  text,
  postedAt: new Date("2026-08-01T00:00:00Z"),
  metrics: { likes: 1, replies: 0, reposts: 0, impressions: null },
});

function makeDeps(
  fetchResult: { ok: true; value: IngestablePost[] } | { ok: false; error: FetchFailure },
  existing: IngestionAccount | null = account,
) {
  const saved: IngestablePost[] = [];
  const watermarks: string[] = [];
  const states: { state: AnalysisState; reason?: AnalysisFailureReason }[] = [];
  let requestedSince: string | null | undefined;

  const ingestion: IngestionRepository = {
    findAccountByUserId: async () => existing,
    saveIngestedPosts: async (_id, items) => {
      saved.push(...items);
      return items.length;
    },
    updateIngestionWatermark: async (_id, newest) => {
      watermarks.push(newest);
    },
    countIngestedPosts: async () => saved.length,
    findAccessTokenForAccount: async () => null,
    findUserIdForAccount: async () => "u1",
    listPostsMissingEmbedding: async () => [],
    saveEmbeddings: async () => {},
    findSimilarPosts: async () => [],
    findPostsMatchingTerms: async () => [],
    setAnalysisState: async (_id, state, reason) => {
      states.push(reason ? { state, reason } : { state });
    },
  };

  const deps: IngestAccountPostsDeps = {
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
    xContent: {
      fetchRecentPosts: async (request) => {
        requestedSince = request.sincePostId;
        return fetchResult.ok ? ok(fetchResult.value) : err(fetchResult.error);
      },
    },
    cipher: {
      encrypt: (plain) => new TextEncoder().encode(plain),
      decrypt: (data) => new TextDecoder().decode(data),
    },
  };

  return { deps, saved, watermarks, states, getRequestedSince: () => requestedSince };
}

const fetched = (posts: IngestablePost[]) => ({ ok: true as const, value: posts });
const failed = (status: number) => ({
  ok: false as const,
  error: { status, detail: `X API ${status}` },
});

describe("ingestAccountPosts", () => {
  it("stores only posts usable for a voice profile", async () => {
    const { deps, saved } = makeDeps(
      fetched([
        makePost("101", "A properly substantial post that reveals how this person writes."),
        makePost("102", "too short"),
        makePost("103", "RT @someone: this is a retweet that says nothing about my own voice."),
      ]),
    );

    const result = await ingestAccountPosts(deps, { userId: "u1", maxPosts: 100 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ fetched: 3, stored: 1 });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.xPostId).toBe("101");
  });

  it("resumes from the stored watermark and advances it", async () => {
    const { deps, watermarks, getRequestedSince } = makeDeps(
      fetched([
        makePost("205", "A long enough post to be considered useful for learning voice."),
        makePost("207", "Another long enough post that should count toward the profile."),
      ]),
    );

    await ingestAccountPosts(deps, { userId: "u1", maxPosts: 100 });

    expect(getRequestedSince()).toBe("100");
    expect(watermarks).toEqual(["207"]);
  });

  it("marks the analysis running then complete on success", async () => {
    const { deps, states } = makeDeps(
      fetched([makePost("300", "A sufficiently long post for the voice profile to learn from.")]),
    );

    await ingestAccountPosts(deps, { userId: "u1", maxPosts: 100 });

    expect(states).toEqual([{ state: "running" }, { state: "complete" }]);
  });

  it("records access_denied when X refuses with 402", async () => {
    const { deps, states } = makeDeps(failed(402));

    const result = await ingestAccountPosts(deps, { userId: "u1", maxPosts: 100 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ingestion_failed");
    expect(states).toEqual([{ state: "running" }, { state: "failed", reason: "access_denied" }]);
  });

  it("records rate_limited when X returns 429", async () => {
    const { deps, states } = makeDeps(failed(429));
    await ingestAccountPosts(deps, { userId: "u1", maxPosts: 100 });
    expect(states.at(-1)).toEqual({ state: "failed", reason: "rate_limited" });
  });

  it("records connection_revoked when the token is rejected", async () => {
    const { deps, states } = makeDeps(failed(401));
    await ingestAccountPosts(deps, { userId: "u1", maxPosts: 100 });
    expect(states.at(-1)).toEqual({ state: "failed", reason: "connection_revoked" });
  });

  it("fails when no X account is connected", async () => {
    const { deps } = makeDeps(fetched([]), null);
    const result = await ingestAccountPosts(deps, { userId: "u1", maxPosts: 100 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("x_connection_revoked");
  });
});
