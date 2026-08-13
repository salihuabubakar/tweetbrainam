import type { OnboardingStep, User } from "@tweetbrainam/core";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createStubDeps } from "../test/stub-deps";

function appAtStep(step: OnboardingStep) {
  const user: User = {
    id: "user-1",
    email: null,
    name: "S",
    timezone: "UTC",
    onboardingStep: step,
    preferences: null,
  };
  const steps: OnboardingStep[] = [];

  const deps = createStubDeps({
    identity: {
      findUserById: async () => user,
      findUserByXUserId: async () => null,
      createUserWithXAccount: async () => user,
      updateXAccountTokens: async () => {},
      recordConsent: async () => {},
      updateOnboardingStep: async (_id, next) => {
        steps.push(next);
      },
      saveUserGoals: async () => {},
      listActiveOnboardedUsers: async () => [],
      findXAccountSummary: async () => null,
      savePreferences: async () => {},
      deleteUser: async () => {},
    },
  });

  return { app: createApp(deps), steps };
}

const session = { cookie: "tb_session=session-1" };

describe("onboarding routes", () => {
  it("requires a session", async () => {
    const { app } = appAtStep("consent");
    const res = await app.request("/v1/onboarding/consent", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("accepts consent and reports the next step", async () => {
    const { app, steps } = appAtStep("consent");
    await app.request("/v1/auth/x/start");
    await app.request("/v1/auth/x/callback?code=c&state=state-1");

    const res = await app.request("/v1/onboarding/consent", {
      method: "POST",
      headers: session,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ onboardingStep: "analyzing" });
    expect(steps).toEqual(["analyzing"]);
  });

  it("returns 409 when consent is repeated", async () => {
    const { app } = appAtStep("goals");
    await app.request("/v1/auth/x/start");
    await app.request("/v1/auth/x/callback?code=c&state=state-1");

    const res = await app.request("/v1/onboarding/consent", {
      method: "POST",
      headers: session,
    });
    expect(res.status).toBe(409);
  });

  it("saves goals and advances to plan", async () => {
    const { app, steps } = appAtStep("goals");
    await app.request("/v1/auth/x/start");
    await app.request("/v1/auth/x/callback?code=c&state=state-1");

    const res = await app.request("/v1/onboarding/goals", {
      method: "POST",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ goal: "authority", postsPerWeek: 5, timezone: "Africa/Lagos" }),
    });
    expect(res.status).toBe(200);
    expect(steps).toEqual(["plan"]);
  });

  it("rejects invalid goals payloads", async () => {
    const { app } = appAtStep("goals");
    await app.request("/v1/auth/x/start");
    await app.request("/v1/auth/x/callback?code=c&state=state-1");

    const res = await app.request("/v1/onboarding/goals", {
      method: "POST",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ goal: "world_domination", postsPerWeek: 99, timezone: "" }),
    });
    expect(res.status).toBe(400);
  });
});
