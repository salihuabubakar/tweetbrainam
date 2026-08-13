import { describe, expect, it } from "vitest";
import { canRevisit, hasReached, nextOnboardingStep, onboardingSteps } from "./onboarding";

describe("hasReached", () => {
  it("is true for the step you are on", () => {
    expect(hasReached("goals", "goals")).toBe(true);
  });

  it("is true for steps behind you", () => {
    expect(hasReached("plan", "voice")).toBe(true);
  });

  it("is false for steps ahead of you", () => {
    expect(hasReached("voice", "plan")).toBe(false);
  });
});

describe("canRevisit", () => {
  it("lets you look back at a completed step", () => {
    expect(canRevisit("plan", "voice")).toBe(true);
    expect(canRevisit("first_draft", "goals")).toBe(true);
  });

  it("refuses a step you have not reached", () => {
    expect(canRevisit("voice", "first_draft")).toBe(false);
  });

  it("never lets you revisit consent", () => {
    expect(canRevisit("first_draft", "consent")).toBe(false);
  });

  it("does not treat the finished state as a destination", () => {
    expect(canRevisit("first_draft", "done")).toBe(false);
  });
});

describe("onboarding order", () => {
  it("points every step at the one after it, and the last at nothing", () => {
    const transitions = onboardingSteps.map((step) => nextOnboardingStep[step]);
    const expected = [...onboardingSteps.slice(1), null];

    expect(transitions).toEqual(expected);
  });
});
