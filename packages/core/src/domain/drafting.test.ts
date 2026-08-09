import { describe, expect, it } from "vitest";
import {
  type Draft,
  canTransition,
  isPublishable,
  segmentsToPlainText,
  segmentsWithinLimit,
} from "./drafting";

const draftWith = (overrides: Partial<Draft>): Draft => ({
  id: "d1",
  planSlotId: null,
  status: "approved",
  currentVersion: {
    id: "v1",
    version: 1,
    segments: [{ text: "A perfectly ordinary post." }],
    author: "ai",
    createdAt: new Date(),
  },
  ...overrides,
});

describe("canTransition", () => {
  it("allows generation to finish or fail", () => {
    expect(canTransition("generating", "needs_review")).toBe(true);
    expect(canTransition("generating", "failed")).toBe(true);
  });

  it("refuses to approve something still being written", () => {
    expect(canTransition("generating", "approved")).toBe(false);
  });

  it("sends an edited approved draft back for review", () => {
    expect(canTransition("approved", "needs_review")).toBe(true);
  });

  it("treats archived as terminal", () => {
    expect(canTransition("archived", "needs_review")).toBe(false);
    expect(canTransition("archived", "approved")).toBe(false);
  });

  it("lets a failed generation be retried", () => {
    expect(canTransition("failed", "generating")).toBe(true);
  });
});

describe("segmentsWithinLimit", () => {
  it("accepts posts at the limit", () => {
    expect(segmentsWithinLimit([{ text: "a".repeat(280) }])).toBe(true);
  });

  it("rejects posts over the limit", () => {
    expect(segmentsWithinLimit([{ text: "a".repeat(281) }])).toBe(false);
  });

  it("checks every segment of a thread", () => {
    expect(segmentsWithinLimit([{ text: "short" }, { text: "a".repeat(300) }])).toBe(false);
  });
});

describe("isPublishable", () => {
  it("accepts an approved draft with valid content", () => {
    expect(isPublishable(draftWith({}))).toBe(true);
  });

  it("refuses a draft awaiting review", () => {
    expect(isPublishable(draftWith({ status: "needs_review" }))).toBe(false);
  });

  it("refuses a draft with no content", () => {
    expect(isPublishable(draftWith({ currentVersion: null }))).toBe(false);
  });

  it("refuses a draft with an over-long segment", () => {
    const draft = draftWith({});
    const overLong = {
      ...draft,
      currentVersion: draft.currentVersion
        ? { ...draft.currentVersion, segments: [{ text: "a".repeat(281) }] }
        : null,
    };
    expect(isPublishable(overLong)).toBe(false);
  });
});

describe("segmentsToPlainText", () => {
  it("joins thread segments with blank lines", () => {
    expect(segmentsToPlainText([{ text: "One" }, { text: "Two" }])).toBe("One\n\nTwo");
  });
});
