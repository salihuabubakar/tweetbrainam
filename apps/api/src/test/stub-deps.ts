import type { User } from "@tweetbrainam/core";
import type { AppDeps } from "../deps";

export const stubUser: User = {
  id: "user-1",
  email: null,
  name: "Salihu",
  timezone: "UTC",
  onboardingStep: "consent",
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
    },
    clock: { now: () => new Date("2026-08-06T12:00:00Z") },
    ...overrides,
  };
}
