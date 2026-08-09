import { describe, expect, it } from "vitest";
import {
  inferPostingWindows,
  localWallClockToUtc,
  mondayOf,
  nextMondayOf,
  resolvePostingWindows,
} from "./planning";

describe("resolvePostingWindows", () => {
  it("posts morning and evening on each chosen day", () => {
    const windows = resolvePostingWindows(5, []);
    expect(windows).toEqual([
      { dayOffset: 0, hour: 9 },
      { dayOffset: 0, hour: 18 },
      { dayOffset: 2, hour: 9 },
      { dayOffset: 2, hour: 18 },
      { dayOffset: 4, hour: 9 },
    ]);
  });

  it("spreads chosen days across the week rather than clustering", () => {
    const days = [...new Set(resolvePostingWindows(5, []).map((w) => w.dayOffset))];
    expect(days).toEqual([0, 2, 4]);
  });

  it("gives every weekday a morning and evening slot at ten a week", () => {
    const windows = resolvePostingWindows(10, []);
    expect(windows).toHaveLength(10);
    expect(new Set(windows.map((w) => w.dayOffset)).size).toBe(5);
    expect(new Set(windows.map((w) => w.hour))).toEqual(new Set([9, 18]));
  });

  it("uses the whole week once weekdays are full", () => {
    const windows = resolvePostingWindows(14, []);
    expect(new Set(windows.map((w) => w.dayOffset)).size).toBe(7);
  });

  it("adds a midday slot only at high volume", () => {
    expect(new Set(resolvePostingWindows(21, []).map((w) => w.hour))).toEqual(new Set([9, 13, 18]));
  });

  it("never returns more windows than posts requested", () => {
    for (const count of [1, 3, 5, 7, 10, 14, 21]) {
      expect(resolvePostingWindows(count, [])).toHaveLength(count);
    }
  });

  it("never schedules two posts at the same moment", () => {
    for (const count of [3, 5, 7, 10, 14, 21]) {
      const windows = resolvePostingWindows(count, []);
      expect(new Set(windows.map((w) => `${w.dayOffset}-${w.hour}`)).size).toBe(count);
    }
  });

  it("prefers configured windows over defaults", () => {
    const configured = [
      { dayOffset: 2, hour: 20 },
      { dayOffset: 0, hour: 7 },
    ];
    expect(resolvePostingWindows(2, configured)).toEqual([
      { dayOffset: 0, hour: 7 },
      { dayOffset: 2, hour: 20 },
    ]);
  });
});

describe("inferPostingWindows", () => {
  const postsAtHours = (hours: number[]): Date[] =>
    hours.map(
      (hour) => new Date(`2026-07-0${(hour % 7) + 1}T${String(hour).padStart(2, "0")}:30:00Z`),
    );

  it("learns the hours this person actually posts at", () => {
    const history = postsAtHours([7, 7, 7, 7, 7, 21, 21, 21, 21, 21, 15, 3]);
    const windows = inferPostingWindows(history, "UTC", 6);

    expect(new Set(windows.map((w) => w.hour))).toEqual(new Set([7, 21]));
  });

  it("ignores history that is too thin to be meaningful", () => {
    expect(inferPostingWindows(postsAtHours([7, 7, 21]), "UTC", 5)).toEqual([]);
  });

  it("reads hours in the user's timezone, not UTC", () => {
    const history = Array.from({ length: 14 }, () => new Date("2026-07-01T23:00:00Z"));
    const windows = inferPostingWindows(history, "Africa/Lagos", 4);

    expect(windows.every((w) => w.hour === 0)).toBe(true);
  });

  it("returns exactly the number of slots requested", () => {
    const history = Array.from({ length: 20 }, () => new Date("2026-07-01T08:00:00Z"));
    expect(inferPostingWindows(history, "UTC", 5)).toHaveLength(5);
  });
});

describe("localWallClockToUtc", () => {
  it("converts a Lagos wall clock time to the right instant", () => {
    const instant = localWallClockToUtc("2026-08-10", { dayOffset: 0, hour: 9 }, "Africa/Lagos");
    expect(instant.toISOString()).toBe("2026-08-10T08:00:00.000Z");
  });

  it("respects the day offset", () => {
    const instant = localWallClockToUtc("2026-08-10", { dayOffset: 3, hour: 13 }, "Africa/Lagos");
    expect(instant.toISOString()).toBe("2026-08-13T12:00:00.000Z");
  });

  it("handles zones behind UTC", () => {
    const instant = localWallClockToUtc(
      "2026-08-10",
      { dayOffset: 0, hour: 9 },
      "America/New_York",
    );
    expect(instant.toISOString()).toBe("2026-08-10T13:00:00.000Z");
  });

  it("treats UTC as a no-op", () => {
    const instant = localWallClockToUtc("2026-08-10", { dayOffset: 1, hour: 18 }, "UTC");
    expect(instant.toISOString()).toBe("2026-08-11T18:00:00.000Z");
  });
});

describe("week boundaries", () => {
  it("finds the Monday of a mid-week date", () => {
    expect(mondayOf(new Date("2026-08-06T15:00:00Z"))).toBe("2026-08-03");
  });

  it("returns the same day when given a Monday", () => {
    expect(mondayOf(new Date("2026-08-03T00:00:00Z"))).toBe("2026-08-03");
  });

  it("treats Sunday as the end of its week", () => {
    expect(mondayOf(new Date("2026-08-09T23:00:00Z"))).toBe("2026-08-03");
  });

  it("finds the following Monday", () => {
    expect(nextMondayOf(new Date("2026-08-06T15:00:00Z"))).toBe("2026-08-10");
  });
});
