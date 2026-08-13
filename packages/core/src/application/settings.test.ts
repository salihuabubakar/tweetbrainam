import { describe, expect, it } from "vitest";
import type { User } from "../domain/identity";
import type { UserPreferences } from "../domain/onboarding";
import type { IdentityRepository } from "../ports/identity-repository";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { UsageRepository } from "../ports/usage-repository";
import type { XOAuthClient } from "../ports/x-oauth-client";
import { deleteAccount } from "./delete-account";
import { getSettings } from "./get-settings";
import { updatePreferences } from "./update-preferences";

const windows = [
  { dayOffset: 0, hour: 9 },
  { dayOffset: 2, hour: 9 },
  { dayOffset: 4, hour: 9 },
];

type SavedPreferences = { timezone: string; preferences: UserPreferences };

function makeIdentity() {
  const saved: SavedPreferences[] = [];
  const deleted: string[] = [];

  const user: User = {
    id: "u1",
    email: null,
    name: "S",
    timezone: "Africa/Lagos",
    onboardingStep: "done",
    preferences: { goal: "authority", postsPerWeek: 3, postingWindows: windows },
  };

  const identity = {
    findUserById: async () => user,
    savePreferences: async (_id: string, input: SavedPreferences) => {
      saved.push(input);
    },
    deleteUser: async (id: string) => {
      deleted.push(id);
    },
    findXAccountSummary: async () => ({
      handle: "salihu",
      displayName: "Salihu",
      avatarUrl: null,
      connectionStatus: "connected" as const,
      connectedAt: new Date("2026-07-01T00:00:00Z"),
    }),
  } as unknown as IdentityRepository;

  return { identity, saved, deleted };
}

describe("updatePreferences", () => {
  it("keeps posting times when only the goal changes", async () => {
    const { identity, saved } = makeIdentity();

    const result = await updatePreferences(
      { identity },
      { userId: "u1", goal: "leads", postsPerWeek: 3, timezone: "Africa/Lagos" },
    );

    expect(result.ok).toBe(true);
    expect(saved[0]?.preferences.goal).toBe("leads");
    expect(saved[0]?.preferences.postingWindows).toEqual(windows);
  });

  it("resets posting times when the cadence changes", async () => {
    const { identity, saved } = makeIdentity();

    await updatePreferences(
      { identity },
      { userId: "u1", goal: "authority", postsPerWeek: 7, timezone: "Africa/Lagos" },
    );

    expect(saved[0]?.preferences.postingWindows).toEqual([]);
  });

  it("resets posting times when the timezone changes", async () => {
    const { identity, saved } = makeIdentity();

    await updatePreferences(
      { identity },
      { userId: "u1", goal: "authority", postsPerWeek: 3, timezone: "Europe/London" },
    );

    expect(saved[0]?.timezone).toBe("Europe/London");
    expect(saved[0]?.preferences.postingWindows).toEqual([]);
  });

  it("rejects a cadence outside the allowed range", async () => {
    const { identity, saved } = makeIdentity();

    const result = await updatePreferences(
      { identity },
      { userId: "u1", goal: "authority", postsPerWeek: 40, timezone: "Africa/Lagos" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation_failed");
    expect(saved).toHaveLength(0);
  });
});

function makeDeleteDeps(options: { revokeThrows?: boolean; hasAccount?: boolean } = {}) {
  const { identity, deleted } = makeIdentity();
  let revokeCalls = 0;

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

  const xOAuth = {
    revokeToken: async () => {
      revokeCalls += 1;
      if (options.revokeThrows) throw new Error("X said no");
    },
  } as unknown as XOAuthClient;

  const deps = {
    identity,
    ingestion,
    xOAuth,
    cipher: {
      encrypt: (plain: string) => new TextEncoder().encode(plain),
      decrypt: (data: Uint8Array) => new TextDecoder().decode(data),
    },
  };

  return { deps, deleted, getRevokeCalls: () => revokeCalls };
}

describe("deleteAccount", () => {
  it("revokes the X token and deletes the user", async () => {
    const { deps, deleted, getRevokeCalls } = makeDeleteDeps();

    const result = await deleteAccount(deps, { userId: "u1" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tokenRevoked).toBe(true);
    expect(getRevokeCalls()).toBe(1);
    expect(deleted).toEqual(["u1"]);
  });

  it("still deletes the user when X refuses to revoke", async () => {
    const { deps, deleted } = makeDeleteDeps({ revokeThrows: true });

    const result = await deleteAccount(deps, { userId: "u1" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tokenRevoked).toBe(false);
    expect(deleted).toEqual(["u1"]);
  });

  it("deletes an account with no connected X profile", async () => {
    const { deps, deleted, getRevokeCalls } = makeDeleteDeps({ hasAccount: false });

    const result = await deleteAccount(deps, { userId: "u1" });

    expect(result.ok).toBe(true);
    expect(getRevokeCalls()).toBe(0);
    expect(deleted).toEqual(["u1"]);
  });
});

describe("getSettings", () => {
  it("reports usage for every metric against the plan limit", async () => {
    const { identity } = makeIdentity();
    const usage = {
      findSubscription: async () => ({
        planCode: "free_beta" as const,
        status: "active" as const,
        trialEndsAt: null,
      }),
      startTrial: async () => {},
      countUsage: async () => 10,
      countUsageByMetric: async () => ({
        draft_generated: 10,
        plan_generated: 10,
        post_published: 10,
      }),
      recordUsage: async () => {},
    } satisfies UsageRepository;

    const result = await getSettings(
      { identity, usage, clock: { now: () => new Date("2026-08-06T12:00:00Z") } },
      { userId: "u1" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.plan.period).toBe("2026-08");
    expect(result.value.plan.usage).toHaveLength(3);
    expect(result.value.cadence).toEqual({
      goal: "authority",
      postsPerWeek: 3,
      timezone: "Africa/Lagos",
    });

    const drafts = result.value.plan.usage.find((line) => line.metric === "draft_generated");
    expect(drafts).toEqual({ metric: "draft_generated", used: 10, limit: 120, remaining: 110 });
  });
});
