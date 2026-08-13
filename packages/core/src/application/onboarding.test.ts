import { describe, expect, it } from "vitest";
import type { User } from "../domain/identity";
import type { OnboardingStep } from "../domain/onboarding";
import type { IdentityRepository } from "../ports/identity-repository";
import { acceptConsent } from "./accept-consent";
import { advanceOnboarding } from "./advance-onboarding";
import { saveGoals } from "./save-goals";

function makeIdentity(step: OnboardingStep) {
  const calls = {
    consentAt: null as Date | null,
    steps: [] as OnboardingStep[],
    goalsSaved: 0,
  };
  const user: User = {
    id: "u1",
    email: null,
    name: "S",
    timezone: "UTC",
    onboardingStep: step,
    preferences: null,
  };

  const identity: IdentityRepository = {
    findUserById: async () => user,
    findUserByXUserId: async () => null,
    createUserWithXAccount: async () => user,
    updateXAccountTokens: async () => {},
    recordConsent: async (_userId, at) => {
      calls.consentAt = at;
    },
    updateOnboardingStep: async (_userId, next) => {
      calls.steps.push(next);
    },
    saveUserGoals: async () => {
      calls.goalsSaved += 1;
    },
    listActiveOnboardedUsers: async () => [],
    findXAccountSummary: async () => null,
    savePreferences: async () => {},
    deleteUser: async () => {},
  };

  return { identity, calls };
}

const clock = { now: () => new Date("2026-08-06T12:00:00Z") };
const jobs = {
  startAccountAnalysis: async () => {},
  startVoiceProfileBuild: async () => {},
  startMemoryExtraction: async () => {},
  startWeeklyPlanGeneration: async () => {},
  startDraftGeneration: async () => {},
  schedulePublish: async () => null,
  cancelPublish: async () => {},
};

describe("acceptConsent", () => {
  it("records consent and moves to analyzing", async () => {
    const { identity, calls } = makeIdentity("consent");
    const result = await acceptConsent({ identity, clock, jobs }, { userId: "u1" });
    expect(result.ok).toBe(true);
    expect(calls.consentAt).toEqual(clock.now());
    expect(calls.steps).toEqual(["analyzing"]);
  });

  it("rejects when consent was already given", async () => {
    const { identity } = makeIdentity("goals");
    const result = await acceptConsent({ identity, clock, jobs }, { userId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("onboarding_step_invalid");
  });
});

describe("advanceOnboarding", () => {
  it("advances analyzing to voice", async () => {
    const { identity, calls } = makeIdentity("analyzing");
    const result = await advanceOnboarding({ identity }, { userId: "u1" });
    expect(result.ok && result.value.onboardingStep).toBe("voice");
    expect(calls.steps).toEqual(["voice"]);
  });

  it("refuses to skip the consent step", async () => {
    const { identity } = makeIdentity("consent");
    const result = await advanceOnboarding({ identity }, { userId: "u1" });
    expect(result.ok).toBe(false);
  });

  it("refuses to skip the goals step", async () => {
    const { identity } = makeIdentity("goals");
    const result = await advanceOnboarding({ identity }, { userId: "u1" });
    expect(result.ok).toBe(false);
  });
});

describe("saveGoals", () => {
  const goals = { goal: "build_in_public", postsPerWeek: 5, timezone: "Africa/Lagos" } as const;

  it("saves goals and moves to plan", async () => {
    const { identity, calls } = makeIdentity("goals");
    const result = await saveGoals({ identity }, { userId: "u1", goals });
    expect(result.ok && result.value.onboardingStep).toBe("plan");
    expect(calls.goalsSaved).toBe(1);
    expect(calls.steps).toEqual(["plan"]);
  });

  it("rejects before the goals step is reached", async () => {
    const { identity } = makeIdentity("analyzing");
    const result = await saveGoals({ identity }, { userId: "u1", goals });
    expect(result.ok).toBe(false);
  });

  it("saves when revisiting goals later, without rewinding progress", async () => {
    const { identity, calls } = makeIdentity("first_draft");

    const result = await saveGoals({ identity }, { userId: "u1", goals });

    expect(result.ok && result.value.onboardingStep).toBe("first_draft");
    expect(calls.goalsSaved).toBe(1);
    expect(calls.steps).toEqual([]);
  });
});
