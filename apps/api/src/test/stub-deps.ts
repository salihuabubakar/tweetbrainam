import type { User } from "@tweetbrainam/core";
import type { AppDeps } from "../deps";

export const stubUser: User = {
  id: "user-1",
  email: null,
  name: "Salihu",
  timezone: "UTC",
  onboardingStep: "consent",
  preferences: null,
};

export function createStubDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  const sessions = new Map<string, string>();
  const states = new Map<string, string>();

  return {
    pkce: {
      generatePair: () => ({ verifier: "verifier", challenge: "challenge" }),
      generateState: () => "state-1",
    },
    states: {
      save: async (state, verifier) => {
        states.set(state, verifier);
      },
      consume: async (state) => {
        const verifier = states.get(state) ?? null;
        states.delete(state);
        return verifier;
      },
    },
    sessions: {
      create: async (userId) => {
        sessions.set("session-1", userId);
        return "session-1";
      },
      getUserId: async (sessionId) => sessions.get(sessionId) ?? null,
      destroy: async (sessionId) => {
        sessions.delete(sessionId);
      },
    },
    xOAuth: {
      buildAuthorizationUrl: (state, challenge) =>
        `https://x.com/i/oauth2/authorize?state=${state}&code_challenge=${challenge}`,
      exchangeCode: async () => ({
        accessToken: "access",
        refreshToken: "refresh",
        expiresInSeconds: 7200,
      }),
      refreshTokens: async () => ({
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresInSeconds: 7200,
      }),
      fetchProfile: async () => ({
        xUserId: "x-123",
        handle: "salihu",
        displayName: "Salihu",
        avatarUrl: null,
      }),
      revokeToken: async () => {},
    },
    cipher: {
      encrypt: (plain) => new TextEncoder().encode(plain),
      decrypt: (data) => new TextDecoder().decode(data),
    },
    identity: {
      findUserByXUserId: async () => null,
      findUserById: async (id) => (id === stubUser.id ? stubUser : null),
      createUserWithXAccount: async () => stubUser,
      updateXAccountTokens: async () => {},
      recordConsent: async () => {},
      updateOnboardingStep: async () => {},
      saveUserGoals: async () => {},
      listActiveOnboardedUserIds: async () => [],
      findXAccountSummary: async () => ({
        handle: "salihu",
        displayName: "Salihu",
        avatarUrl: null,
        connectionStatus: "connected" as const,
        connectedAt: new Date("2026-07-01T00:00:00Z"),
      }),
      savePreferences: async () => {},
      deleteUser: async () => {},
    },
    ingestion: {
      findAccountByUserId: async () => ({
        id: "acc-1",
        xUserId: "x-123",
        accessTokenEnc: new TextEncoder().encode("access"),
        lastIngestedPostId: null,
        analysisState: "idle" as const,
        analysisFailureReason: null,
      }),
      saveIngestedPosts: async (_id, posts) => posts.length,
      updateIngestionWatermark: async () => {},
      countIngestedPosts: async () => 0,
      setAnalysisState: async () => {},
      findAccessTokenForAccount: async () => null,
      listPostsMissingEmbedding: async () => [],
      saveEmbeddings: async () => {},
      findSimilarPosts: async () => [],
      findPostsMatchingTerms: async () => [],
    },
    voice: {
      listSamplePosts: async () => [],
      listPostTimes: async () => [],
      findActiveProfile: async () => null,
      saveProfileAsActive: async () => {
        throw new Error("not used in tests");
      },
    },
    memory: {
      listForUser: async () => [],
      countActive: async () => 0,
      addFacts: async () => [],
      updateFact: async () => null,
      setStatus: async () => {},
      findOwner: async () => null,
    },
    jobs: {
      startAccountAnalysis: async () => {},
      startVoiceProfileBuild: async () => {},
      startMemoryExtraction: async () => {},
      startWeeklyPlanGeneration: async () => {},
      startDraftGeneration: async () => {},
      schedulePublish: async () => null,
      cancelPublish: async () => {},
    },
    schedule: {
      schedule: async () => {
        throw new Error("not used in tests");
      },
      findById: async () => null,
      findByDraft: async () => null,
      listForAccount: async () => [],
      setStatus: async () => {},
      setPublishAt: async () => {},
      setTriggerRunId: async () => {},
      claimForPublishing: async () => true,
    },
    drafts: {
      findById: async () => null,
      listForAccount: async () => [],
      findBySlot: async () => null,
      createGenerating: async () => {
        throw new Error("not used in tests");
      },
      addVersion: async () => {
        throw new Error("not used in tests");
      },
      setStatus: async () => {},
      recordLearningSignal: async () => {},
      findAccountIdForDraft: async () => null,
    },
    plans: {
      findPlanByWeek: async () => null,
      findSlotById: async () => null,
      savePlan: async () => {
        throw new Error("not used in tests");
      },
      updateSlotStatus: async () => {},
    },
    usage: {
      findPlanCode: async () => "free_beta" as const,
      countUsage: async () => 0,
      countUsageByMetric: async () => ({
        draft_generated: 0,
        plan_generated: 0,
        post_published: 0,
      }),
      recordUsage: async () => {},
    },
    clock: { now: () => new Date("2026-08-06T12:00:00Z") },
    ...overrides,
  };
}
