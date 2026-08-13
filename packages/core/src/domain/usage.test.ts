import { describe, expect, it } from "vitest";
import {
  PLAN_LIMITS,
  PLAN_SCAN_LIMITS,
  type Subscription,
  TRIAL_DAYS,
  canGenerate,
  checkQuota,
  currentPeriod,
  isTrialExpired,
  quotaPeriod,
  trialDaysRemaining,
  trialEndsAtFrom,
} from "./usage";

const startedAt = new Date("2026-08-01T09:00:00Z");

const trial = (overrides: Partial<Subscription> = {}): Subscription => ({
  planCode: "trial",
  status: "trialing",
  trialEndsAt: trialEndsAtFrom(startedAt),
  ...overrides,
});

describe("checkQuota", () => {
  it("allows usage below the limit", () => {
    const check = checkQuota("free_beta", "draft_generated", 10);
    expect(check.allowed).toBe(true);
    expect(check.remaining).toBe(PLAN_LIMITS.free_beta.draft_generated - 10);
  });

  it("blocks once the limit is reached", () => {
    const limit = PLAN_LIMITS.free_beta.draft_generated;
    expect(checkQuota("free_beta", "draft_generated", limit).allowed).toBe(false);
  });

  it("never reports negative remaining", () => {
    const limit = PLAN_LIMITS.free_beta.plan_generated;
    expect(checkQuota("free_beta", "plan_generated", limit + 50).remaining).toBe(0);
  });

  it("gives paid plans more headroom than the beta", () => {
    expect(PLAN_LIMITS.pro.draft_generated).toBeGreaterThan(PLAN_LIMITS.free_beta.draft_generated);
    expect(PLAN_LIMITS.team.draft_generated).toBeGreaterThan(PLAN_LIMITS.pro.draft_generated);
  });
});

describe("trial limits", () => {
  it("gives a trial less of everything than the beta", () => {
    for (const metric of ["draft_generated", "plan_generated", "post_published"] as const) {
      expect(PLAN_LIMITS.trial[metric]).toBeLessThan(PLAN_LIMITS.free_beta[metric]);
    }
    expect(PLAN_SCAN_LIMITS.trial).toBeLessThan(PLAN_SCAN_LIMITS.free_beta);
  });

  it("still allows a full week of posting inside the trial", () => {
    expect(PLAN_LIMITS.trial.post_published).toBeGreaterThanOrEqual(TRIAL_DAYS);
  });

  it("allows two plans, so a trial covers a planning run and a redo", () => {
    expect(PLAN_LIMITS.trial.plan_generated).toBeGreaterThanOrEqual(2);
  });
});

describe("quotaPeriod", () => {
  it("counts a trial once for its whole life, not per calendar month", () => {
    expect(quotaPeriod("trial", new Date("2026-08-31T23:00:00Z"))).toBe("trial");
    expect(quotaPeriod("trial", new Date("2026-09-01T01:00:00Z"))).toBe("trial");
  });

  it("keeps paid plans on monthly buckets", () => {
    expect(quotaPeriod("pro", new Date("2026-08-31T23:00:00Z"))).toBe("2026-08");
    expect(quotaPeriod("pro", new Date("2026-09-01T01:00:00Z"))).toBe("2026-09");
  });
});

describe("trial expiry", () => {
  it("runs for exactly seven days from signup", () => {
    expect(trialEndsAtFrom(startedAt).toISOString()).toBe("2026-08-08T09:00:00.000Z");
  });

  it("is not expired on the last day", () => {
    expect(isTrialExpired(trial(), new Date("2026-08-08T08:59:00Z"))).toBe(false);
  });

  it("is expired once the end time passes", () => {
    expect(isTrialExpired(trial(), new Date("2026-08-08T09:00:00Z"))).toBe(true);
  });

  it("never expires a paid plan", () => {
    const paid = trial({ planCode: "pro", status: "active" });
    expect(isTrialExpired(paid, new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });

  it("counts down whole days remaining", () => {
    expect(trialDaysRemaining(trial(), new Date("2026-08-01T09:00:00Z"))).toBe(7);
    expect(trialDaysRemaining(trial(), new Date("2026-08-07T09:00:00Z"))).toBe(1);
    expect(trialDaysRemaining(trial(), new Date("2026-08-09T09:00:00Z"))).toBe(0);
  });
});

describe("canGenerate", () => {
  it("allows an in-flight trial", () => {
    expect(canGenerate(trial(), new Date("2026-08-03T09:00:00Z"))).toBe(true);
  });

  it("stops generation the moment a trial expires", () => {
    expect(canGenerate(trial(), new Date("2026-08-09T09:00:00Z"))).toBe(false);
  });

  it("stops generation for a canceled subscription", () => {
    const canceled = trial({ planCode: "pro", status: "canceled" });
    expect(canGenerate(canceled, new Date("2026-08-03T09:00:00Z"))).toBe(false);
  });

  it("allows an active paid subscription", () => {
    const paid = trial({ planCode: "pro", status: "active" });
    expect(canGenerate(paid, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });
});

describe("currentPeriod", () => {
  it("buckets by calendar month in UTC", () => {
    expect(currentPeriod(new Date("2026-08-06T23:00:00Z"))).toBe("2026-08");
    expect(currentPeriod(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });

  it("rolls over at the month boundary", () => {
    expect(currentPeriod(new Date("2026-08-31T23:59:59Z"))).toBe("2026-08");
    expect(currentPeriod(new Date("2026-09-01T00:00:00Z"))).toBe("2026-09");
  });
});
