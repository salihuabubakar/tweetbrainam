import type { VoiceProfile } from "@tweetbrainam/core";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createStubDeps } from "../test/stub-deps";

const session = { cookie: "tb_session=session-1" };

const traits: VoiceProfile["traits"] = {
  tones: ["direct"],
  formality: 0.3,
  averageSentenceLength: "short",
  usesEmoji: false,
  usesHashtags: false,
  favouriteFormats: [],
  vocabularyQuirks: [],
  rules: ["Open with the claim"],
};

const active: VoiceProfile = {
  id: "vp-1",
  version: 1,
  traits,
  topics: ["shipping"],
  sampleSentences: ["So we shipped it."],
  source: "analysis",
  isActive: true,
  postsAnalyzed: 40,
  createdAt: new Date("2026-08-01T00:00:00Z"),
};

async function signedInApp(overrides: Parameters<typeof createStubDeps>[0] = {}) {
  const app = createApp(createStubDeps(overrides));
  await app.request("/v1/auth/x/start");
  await app.request("/v1/auth/x/callback?code=c&state=state-1");
  return app;
}

describe("voice routes", () => {
  it("requires a session", async () => {
    const app = createApp(createStubDeps());
    const res = await app.request("/v1/voice", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ traits, topics: ["shipping"] }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects an edit with no tones", async () => {
    const app = await signedInApp();

    const res = await app.request("/v1/voice", {
      method: "PUT",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ traits: { ...traits, tones: [] }, topics: ["shipping"] }),
    });

    expect(res.status).toBe(400);
  });

  it("refuses to edit before an analysis exists", async () => {
    const app = await signedInApp();

    const res = await app.request("/v1/voice", {
      method: "PUT",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ traits, topics: ["shipping"] }),
    });

    expect(res.status).toBe(409);
  });

  it("saves an edit as a new version", async () => {
    const saved: unknown[] = [];
    const app = await signedInApp({
      voice: {
        listSamplePosts: async () => [],
        listPostTimes: async () => [],
        findActiveProfile: async () => active,
        saveProfileAsActive: async (input) => {
          saved.push(input);
          return { ...active, id: "vp-2", version: 2, source: "user_edit" };
        },
      },
    });

    const res = await app.request("/v1/voice", {
      method: "PUT",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ traits: { ...traits, usesEmoji: true }, topics: ["shipping"] }),
    });

    expect(res.status).toBe(200);
    expect(saved).toHaveLength(1);
  });

  it("accepts a rebuild request", async () => {
    const app = await signedInApp();

    const res = await app.request("/v1/voice/rebuild", { method: "POST", headers: session });

    expect(res.status).toBe(202);
  });
});
