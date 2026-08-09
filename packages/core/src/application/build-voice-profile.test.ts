import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { VoiceProfile, VoiceTraits } from "../domain/voice";
import { err, ok } from "../lib/result";
import type { AIProvider } from "../ports/ai-provider";
import type { IngestionAccount, IngestionRepository } from "../ports/ingestion-repository";
import type { SaveVoiceProfileInput, VoiceRepository } from "../ports/voice-repository";
import { type BuildVoiceProfileDeps, buildVoiceProfile } from "./build-voice-profile";

const account: IngestionAccount = {
  id: "acc-1",
  xUserId: "x-1",
  accessTokenEnc: new Uint8Array(),
  lastIngestedPostId: null,
  analysisState: "complete",
  analysisFailureReason: null,
};

const traits: VoiceTraits = {
  tones: ["direct"],
  formality: 0.3,
  averageSentenceLength: "short",
  usesEmoji: false,
  usesHashtags: false,
  favouriteFormats: ["build-log updates"],
  vocabularyQuirks: ["starts sentences with 'So'"],
  rules: ["Open with the claim"],
};

const analysis = { traits, topics: ["shipping"], sampleSentences: ["So we shipped it."] };

function makeDeps(options: {
  posts?: string[];
  aiFails?: boolean;
  existingAccount?: IngestionAccount | null;
}) {
  const saved: SaveVoiceProfileInput[] = [];
  const posts = options.posts ?? ["a post", "another post"];

  const resolvedAccount = "existingAccount" in options ? options.existingAccount : account;

  const ingestion = {
    findAccountByUserId: async () => resolvedAccount,
  } as unknown as IngestionRepository;

  const voice: VoiceRepository = {
    listSamplePosts: async () => posts,
    listPostTimes: async () => [],
    findActiveProfile: async () => null,
    saveProfileAsActive: async (input) => {
      saved.push(input);
      return {
        id: "vp-1",
        version: 1,
        traits: input.traits,
        topics: input.topics,
        sampleSentences: input.sampleSentences,
        source: input.source,
        isActive: true,
        postsAnalyzed: input.postsAnalyzed,
        createdAt: new Date("2026-08-06T12:00:00Z"),
      } satisfies VoiceProfile;
    },
  };

  const ai = {
    name: "stub",
    generateObject: async () =>
      options.aiFails
        ? err({ kind: "unavailable" as const, detail: "provider down" })
        : ok({
            value: analysis,
            usage: {
              provider: "stub",
              model: "test",
              inputTokens: 10,
              outputTokens: 20,
              latencyMs: 5,
            },
          }),
  } as unknown as AIProvider;

  const deps: BuildVoiceProfileDeps = {
    ingestion,
    voice,
    ai,
    buildRequest: (samplePosts) => ({
      system: "system",
      prompt: samplePosts.join("\n"),
      schema: z.unknown(),
    }),
  };

  return { deps, saved };
}

describe("buildVoiceProfile", () => {
  it("saves an active profile from the analysis", async () => {
    const { deps, saved } = makeDeps({});

    const result = await buildVoiceProfile(deps, { userId: "u1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.profile.isActive).toBe(true);
      expect(result.value.profile.traits.tones).toEqual(["direct"]);
      expect(result.value.usage.inputTokens).toBe(10);
    }
    expect(saved[0]).toMatchObject({ source: "analysis", postsAnalyzed: 2 });
  });

  it("refuses when there are no posts to learn from", async () => {
    const { deps } = makeDeps({ posts: [] });

    const result = await buildVoiceProfile(deps, { userId: "u1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("insufficient_posts");
  });

  it("surfaces provider failures as generation_failed", async () => {
    const { deps, saved } = makeDeps({ aiFails: true });

    const result = await buildVoiceProfile(deps, { userId: "u1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("generation_failed");
    expect(saved).toHaveLength(0);
  });

  it("fails when no account is connected", async () => {
    const { deps } = makeDeps({ existingAccount: null });

    const result = await buildVoiceProfile(deps, { userId: "u1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("x_connection_revoked");
  });
});
