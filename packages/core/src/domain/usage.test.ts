import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, checkQuota, currentPeriod } from "./usage";

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
