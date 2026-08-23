export const planStatuses = ["draft", "active", "completed"] as const;

export type PlanStatus = (typeof planStatuses)[number];

export const slotStatuses = [
  "empty",
  "drafting",
  "ready",
  "approved",
  "published",
  "skipped",
] as const;

export type SlotStatus = (typeof slotStatuses)[number];

export const postFormats = ["single", "thread"] as const;

export type PostFormat = (typeof postFormats)[number];

export type PlanSlot = {
  id: string;
  topic: string;
  format: PostFormat;
  angle: string;
  targetAt: Date;
  status: SlotStatus;
  position: number;
};

export type ContentPlan = {
  id: string;
  weekStart: string;
  status: PlanStatus;
  rationale: string;
  slots: PlanSlot[];
};

export type PostingWindow = {
  dayOffset: number;
  hour: number;
};

export const MAX_SLOTS_PER_PLAN = 21;

const COMMITTED_SLOT_STATUSES: readonly SlotStatus[] = ["approved", "published"];

export function canEditSlot(status: SlotStatus): boolean {
  return !COMMITTED_SLOT_STATUSES.includes(status);
}

export function canRemoveSlot(status: SlotStatus): boolean {
  return !COMMITTED_SLOT_STATUSES.includes(status);
}

export function canSkipSlot(status: SlotStatus): boolean {
  return status === "empty" || status === "drafting" || status === "ready";
}

export const MORNING_HOUR = 9;
export const MIDDAY_HOUR = 13;
export const EVENING_HOUR = 18;

export const DEFAULT_POSTING_HOURS = [MORNING_HOUR, EVENING_HOUR, MIDDAY_HOUR];

const WEEKDAY_OFFSETS = [0, 1, 2, 3, 4];
const ALL_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

function hoursPerDayFor(postsPerWeek: number): number {
  if (postsPerWeek <= 1) return 1;
  if (postsPerWeek <= 14) return 2;
  return 3;
}

function spreadEvenly(pool: number[], count: number): number[] {
  if (count <= 1) return pool.slice(0, Math.max(count, 0));
  if (count >= pool.length) return [...pool];

  const step = (pool.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => pool[Math.round(index * step)] ?? 0);
}

export function resolvePostingWindows(
  postsPerWeek: number,
  configured: PostingWindow[],
): PostingWindow[] {
  if (configured.length > 0) {
    return [...configured]
      .sort((a, b) => a.dayOffset - b.dayOffset || a.hour - b.hour)
      .slice(0, postsPerWeek);
  }

  const hoursPerDay = hoursPerDayFor(postsPerWeek);
  const hours = [...DEFAULT_POSTING_HOURS.slice(0, hoursPerDay)].sort((a, b) => a - b);
  const daysNeeded = Math.min(Math.ceil(postsPerWeek / hoursPerDay), ALL_DAY_OFFSETS.length);
  const pool = daysNeeded <= WEEKDAY_OFFSETS.length ? WEEKDAY_OFFSETS : ALL_DAY_OFFSETS;
  const days = spreadEvenly(pool, daysNeeded);

  return days
    .flatMap((dayOffset) => hours.map((hour) => ({ dayOffset, hour })))
    .sort((a, b) => a.dayOffset - b.dayOffset || a.hour - b.hour)
    .slice(0, postsPerWeek);
}

const MIN_SAMPLES_FOR_INFERENCE = 12;

export function inferPostingWindows(
  postedAt: Date[],
  timeZone: string,
  postsPerWeek: number,
): PostingWindow[] {
  if (postedAt.length < MIN_SAMPLES_FOR_INFERENCE) return [];

  const hourCounts = new Map<number, number>();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
  });

  for (const instant of postedAt) {
    const hour = Number(formatter.format(instant)) % 24;
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  const hoursPerDay = hoursPerDayFor(postsPerWeek);
  const favouriteHours = [...hourCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, hoursPerDay)
    .map(([hour]) => hour)
    .sort((a, b) => a - b);

  if (favouriteHours.length === 0) return [];

  const daysNeeded = Math.min(
    Math.ceil(postsPerWeek / favouriteHours.length),
    ALL_DAY_OFFSETS.length,
  );
  const pool = daysNeeded <= WEEKDAY_OFFSETS.length ? WEEKDAY_OFFSETS : ALL_DAY_OFFSETS;

  return spreadEvenly(pool, daysNeeded)
    .flatMap((dayOffset) => favouriteHours.map((hour) => ({ dayOffset, hour })))
    .sort((a, b) => a.dayOffset - b.dayOffset || a.hour - b.hour)
    .slice(0, postsPerWeek);
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );

  return asUtc - instant.getTime();
}

export function localWallClockToUtc(
  weekStartIso: string,
  window: PostingWindow,
  timeZone: string,
): Date {
  const [year, month, day] = weekStartIso.split("-").map(Number);
  const naive = Date.UTC(
    year ?? 1970,
    (month ?? 1) - 1,
    (day ?? 1) + window.dayOffset,
    window.hour,
  );
  const offset = timeZoneOffsetMs(new Date(naive), timeZone);
  return new Date(naive - offset);
}

export const PLANNING_HOUR = 17;

const PLANNING_WEEKDAY = "Sun";

type ZonedParts = { date: string; hour: number; weekday: string };

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(instant);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    hour: Number(read("hour")) % 24,
    weekday: read("weekday"),
  };
}

function safeZonedParts(instant: Date, timeZone: string): ZonedParts {
  try {
    return zonedParts(instant, timeZone);
  } catch {
    return zonedParts(instant, "UTC");
  }
}

export function isPlanningHourInZone(instant: Date, timeZone: string): boolean {
  const parts = safeZonedParts(instant, timeZone);
  return parts.weekday === PLANNING_WEEKDAY && parts.hour === PLANNING_HOUR;
}

// A single matching instant gave each user one attempt per week: a transient
// failure — a rate-limited model, a slow provider — cost them the whole week
// with no second chance. The window spans the rest of their local Sunday
// instead, and generateWeeklyPlan returns the existing plan without spending
// quota or calling the model, so repeated hours cost nothing once it succeeds.
export function isPlanningWindowInZone(instant: Date, timeZone: string): boolean {
  const parts = safeZonedParts(instant, timeZone);
  return parts.weekday === PLANNING_WEEKDAY && parts.hour >= PLANNING_HOUR;
}

export function isLocalHour(instant: Date, timeZone: string, hour: number): boolean {
  return safeZonedParts(instant, timeZone).hour === hour;
}

export function nextMondayInZone(instant: Date, timeZone: string): string {
  const parts = safeZonedParts(instant, timeZone);
  return nextMondayOf(new Date(`${parts.date}T00:00:00Z`));
}

export function mondayOf(date: Date): string {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekdayFromMonday = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - weekdayFromMonday);
  return copy.toISOString().slice(0, 10);
}

export function nextMondayOf(date: Date): string {
  const thisMonday = new Date(`${mondayOf(date)}T00:00:00Z`);
  thisMonday.setUTCDate(thisMonday.getUTCDate() + 7);
  return thisMonday.toISOString().slice(0, 10);
}
