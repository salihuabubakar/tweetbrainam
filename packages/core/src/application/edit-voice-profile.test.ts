import { describe, expect, it } from "vitest";
import type { VoiceProfile, VoiceTraits } from "../domain/voice";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { SaveVoiceProfileInput, VoiceRepository } from "../ports/voice-repository";
import { editVoiceProfile } from "./edit-voice-profile";

const traits: VoiceTraits = {
  tones: ["direct"],
  formality: 0.3,
  averageSentenceLength: "short",
  usesEmoji: false,
  usesHashtags: false,
  favouriteFormats: ["build-log updates"],
  vocabularyQuirks: ["says 'ship it'"],
  rules: ["Open with the claim"],
};

const active: VoiceProfile = {
  id: "vp-1",
  version: 2,
  traits,
  topics: ["shipping"],
  sampleSentences: ["So we shipped it."],
  source: "analysis",
  isActive: true,
  postsAnalyzed: 48,
  createdAt: new Date("2026-08-01T00:00:00Z"),
};

function makeDeps(options: { hasAccount?: boolean; hasProfile?: boolean } = {}) {
  const saved: SaveVoiceProfileInput[] = [];

  const ingestion = {
    findAccountByUserId: async () =>
      options.hasAccount === false
        ? null
        : {
            id: "acc-1",
            xUserId: "x-1",
            accessTokenEnc: new TextEncoder().encode("token"),
            lastIngestedPostId: null,
            analysisState: "complete" as const,
            analysisFailureReason: null,
          },
  } as unknown as IngestionRepository;

  const voice = {
    findActiveProfile: async () => (options.hasProfile === false ? null : active),
    saveProfileAsActive: async (input: SaveVoiceProfileInput) => {
      saved.push(input);
      return { ...active, id: "vp-2", version: active.version + 1, ...input };
    },
  } as unknown as VoiceRepository;

  return { deps: { ingestion, voice }, saved };
}

describe("editVoiceProfile", () => {
  it("saves an edit as a new user_edit version", async () => {
    const { deps, saved } = makeDeps();

    const result = await editVoiceProfile(deps, {
      userId: "u1",
      traits: { ...traits, usesEmoji: true },
      topics: ["shipping", "hiring"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.version).toBe(3);
    expect(saved[0]?.source).toBe("user_edit");
    expect(saved[0]?.traits.usesEmoji).toBe(true);
    expect(saved[0]?.topics).toEqual(["shipping", "hiring"]);
  });

  it("carries the sample sentences and post count forward", async () => {
    const { deps, saved } = makeDeps();

    await editVoiceProfile(deps, { userId: "u1", traits, topics: ["hiring"] });

    expect(saved[0]?.sampleSentences).toEqual(active.sampleSentences);
    expect(saved[0]?.postsAnalyzed).toBe(48);
  });

  it("does not create a version when nothing changed", async () => {
    const { deps, saved } = makeDeps();

    const result = await editVoiceProfile(deps, {
      userId: "u1",
      traits,
      topics: [...active.topics],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe("vp-1");
    expect(saved).toHaveLength(0);
  });

  it("refuses to edit before an analysis exists", async () => {
    const { deps } = makeDeps({ hasProfile: false });

    const result = await editVoiceProfile(deps, { userId: "u1", traits, topics: ["shipping"] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("voice_profile_missing");
  });

  it("refuses when no X account is connected", async () => {
    const { deps } = makeDeps({ hasAccount: false });

    const result = await editVoiceProfile(deps, { userId: "u1", traits, topics: ["shipping"] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("x_connection_revoked");
  });
});
