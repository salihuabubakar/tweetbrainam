import { describe, expect, it } from "vitest";
import {
  type ScheduledPost,
  canTransitionPublish,
  isDueForPublishing,
  isRetryable,
} from "./publishing";

const post = (overrides: Partial<ScheduledPost> = {}): ScheduledPost => ({
  id: "sp1",
  draftId: "d1",
  publishAt: new Date("2026-08-10T09:00:00Z"),
  status: "scheduled",
  xPostIds: [],
  failureReason: null,
  triggerRunId: null,
  ...overrides,
});

describe("canTransitionPublish", () => {
  it("allows the normal path from scheduled to published", () => {
    expect(canTransitionPublish("scheduled", "publishing")).toBe(true);
    expect(canTransitionPublish("publishing", "published")).toBe(true);
  });

  it("never lets a published post change again", () => {
    expect(canTransitionPublish("published", "publishing")).toBe(false);
    expect(canTransitionPublish("published", "canceled")).toBe(false);
    expect(canTransitionPublish("published", "scheduled")).toBe(false);
  });

  it("refuses to publish without passing through publishing", () => {
    expect(canTransitionPublish("scheduled", "published")).toBe(false);
  });

  it("lets a failed post be rescheduled or abandoned", () => {
    expect(canTransitionPublish("failed", "scheduled")).toBe(true);
    expect(canTransitionPublish("failed", "canceled")).toBe(true);
  });

  it("lets a canceled post be scheduled again", () => {
    expect(canTransitionPublish("canceled", "scheduled")).toBe(true);
  });
});

describe("isRetryable", () => {
  it("retries transient failures", () => {
    expect(isRetryable("rate_limited")).toBe(true);
    expect(isRetryable("unknown")).toBe(true);
  });

  it("does not retry failures that will always fail", () => {
    expect(isRetryable("duplicate_content")).toBe(false);
    expect(isRetryable("connection_revoked")).toBe(false);
    expect(isRetryable("content_rejected")).toBe(false);
  });
});

describe("isDueForPublishing", () => {
  it("is due once the scheduled moment passes", () => {
    expect(isDueForPublishing(post(), new Date("2026-08-10T09:00:01Z"))).toBe(true);
  });

  it("is due exactly at the scheduled moment", () => {
    expect(isDueForPublishing(post(), new Date("2026-08-10T09:00:00Z"))).toBe(true);
  });

  it("is not due beforehand", () => {
    expect(isDueForPublishing(post(), new Date("2026-08-10T08:59:59Z"))).toBe(false);
  });

  it("is never due unless scheduled", () => {
    const now = new Date("2026-08-11T00:00:00Z");
    expect(isDueForPublishing(post({ status: "canceled" }), now)).toBe(false);
    expect(isDueForPublishing(post({ status: "published" }), now)).toBe(false);
    expect(isDueForPublishing(post({ status: "publishing" }), now)).toBe(false);
  });
});
