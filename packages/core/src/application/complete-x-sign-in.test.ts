import { describe, expect, it } from "vitest";
import type { User, XProfile } from "../domain/identity";
import type { IdentityRepository } from "../ports/identity-repository";
import { type CompleteXSignInDeps, completeXSignIn } from "./complete-x-sign-in";

const profile: XProfile = {
  xUserId: "x-123",
  handle: "salihu",
  displayName: "Salihu",
  avatarUrl: null,
};

const existingUser: User = {
  id: "user-1",
  email: null,
  name: "Salihu",
  timezone: "UTC",
  onboardingStep: "done",
  preferences: null,
};

function makeDeps(overrides: { existing: User | null }) {
  const calls = {
    tokensUpdated: 0,
    usersCreated: 0,
    sessionsCreated: [] as string[],
  };

  const identity: IdentityRepository = {
    findUserByXUserId: async () => overrides.existing,
    findUserById: async () => overrides.existing,
    createUserWithXAccount: async () => {
      calls.usersCreated += 1;
      return { ...existingUser, id: "user-new", onboardingStep: "consent" };
    },
    updateXAccountTokens: async () => {
      calls.tokensUpdated += 1;
    },
    recordConsent: async () => {},
    updateOnboardingStep: async () => {},
    saveUserGoals: async () => {},
    listActiveOnboardedUserIds: async () => [],
    findXAccountSummary: async () => null,
    savePreferences: async () => {},
    deleteUser: async () => {},
  };

  const deps: CompleteXSignInDeps = {
    states: {
      save: async () => {},
      consume: async (state) => (state === "valid-state" ? "verifier" : null),
    },
    xOAuth: {
      buildAuthorizationUrl: () => "https://x.com/authorize",
      exchangeCode: async () => ({
        accessToken: "access",
        refreshToken: "refresh",
        expiresInSeconds: 7200,
      }),
      refreshTokens: async () => {
        throw new Error("not used");
      },
      fetchProfile: async () => profile,
      revokeToken: async () => {},
    },
    cipher: {
      encrypt: (plain) => new TextEncoder().encode(plain),
      decrypt: (data) => new TextDecoder().decode(data),
    },
    identity,
    sessions: {
      create: async (userId) => {
        calls.sessionsCreated.push(userId);
        return "session-1";
      },
      getUserId: async () => null,
      destroy: async () => {},
    },
    clock: { now: () => new Date("2026-08-06T12:00:00Z") },
  };

  return { deps, calls };
}

describe("completeXSignIn", () => {
  it("rejects an unknown or replayed state", async () => {
    const { deps } = makeDeps({ existing: null });
    const result = await completeXSignIn(deps, { code: "code", state: "bad-state" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("oauth_state_invalid");
  });

  it("creates a user and session on first sign-in", async () => {
    const { deps, calls } = makeDeps({ existing: null });
    const result = await completeXSignIn(deps, { code: "code", state: "valid-state" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isNewUser).toBe(true);
      expect(result.value.onboardingStep).toBe("consent");
      expect(result.value.sessionId).toBe("session-1");
    }
    expect(calls.usersCreated).toBe(1);
    expect(calls.tokensUpdated).toBe(0);
    expect(calls.sessionsCreated).toEqual(["user-new"]);
  });

  it("refreshes tokens and resumes for a returning user", async () => {
    const { deps, calls } = makeDeps({ existing: existingUser });
    const result = await completeXSignIn(deps, { code: "code", state: "valid-state" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isNewUser).toBe(false);
      expect(result.value.onboardingStep).toBe("done");
    }
    expect(calls.usersCreated).toBe(0);
    expect(calls.tokensUpdated).toBe(1);
    expect(calls.sessionsCreated).toEqual(["user-1"]);
  });
});
