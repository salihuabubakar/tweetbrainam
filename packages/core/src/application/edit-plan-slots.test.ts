import { describe, expect, it } from "vitest";
import { MAX_SLOTS_PER_PLAN, type PlanSlot, type SlotStatus } from "../domain/planning";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { PlanRepository } from "../ports/plan-repository";
import {
  addPlanSlot,
  removePlanSlot,
  restorePlanSlot,
  skipPlanSlot,
  updatePlanSlot,
} from "./edit-plan-slots";

const slot = (status: SlotStatus): PlanSlot => ({
  id: "slot-1",
  topic: "Shipping",
  format: "single",
  angle: "What we learned",
  targetAt: new Date("2026-08-10T09:00:00Z"),
  status,
  position: 0,
});

function makeDeps(options: { status?: SlotStatus; owner?: string; slotCount?: number } = {}) {
  const statuses: SlotStatus[] = [];
  const deleted: string[] = [];
  const patches: unknown[] = [];
  const added: unknown[] = [];

  const ingestion = {
    findAccountByUserId: async () => ({ id: "acc-1" }),
  } as unknown as IngestionRepository;

  const plans = {
    findAccountIdForSlot: async () => ("owner" in options ? options.owner : "acc-1"),
    findAccountIdForPlan: async () => ("owner" in options ? options.owner : "acc-1"),
    findSlotById: async () => slot(options.status ?? "empty"),
    countSlots: async () => options.slotCount ?? 0,
    updateSlot: async (_id: string, patch: unknown) => {
      patches.push(patch);
      return slot(options.status ?? "empty");
    },
    updateSlotStatus: async (_id: string, status: SlotStatus) => {
      statuses.push(status);
    },
    deleteSlot: async (id: string) => {
      deleted.push(id);
    },
    addSlot: async (_planId: string, input: unknown) => {
      added.push(input);
      return slot("empty");
    },
  } as unknown as PlanRepository;

  return { deps: { ingestion, plans }, statuses, deleted, patches, added };
}

describe("updatePlanSlot", () => {
  it("changes the topic of a slot that hasn't been committed", async () => {
    const { deps, patches } = makeDeps({ status: "ready" });

    const result = await updatePlanSlot(deps, {
      userId: "u1",
      slotId: "slot-1",
      topic: "Something else",
    });

    expect(result.ok).toBe(true);
    expect(patches).toHaveLength(1);
  });

  it("refuses to change an approved slot out from under a scheduled post", async () => {
    const { deps, patches } = makeDeps({ status: "approved" });

    const result = await updatePlanSlot(deps, {
      userId: "u1",
      slotId: "slot-1",
      topic: "Something else",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation_failed");
    expect(patches).toEqual([]);
  });

  it("refuses to change a published slot", async () => {
    const { deps } = makeDeps({ status: "published" });

    const result = await updatePlanSlot(deps, { userId: "u1", slotId: "slot-1", topic: "Nope" });

    expect(result.ok).toBe(false);
  });

  it("will not let one account edit another account's slot", async () => {
    const { deps, patches } = makeDeps({ owner: "acc-2" });

    const result = await updatePlanSlot(deps, { userId: "u1", slotId: "slot-1", topic: "Nope" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
    expect(patches).toEqual([]);
  });
});

describe("skipPlanSlot and restorePlanSlot", () => {
  it("skips a slot that hasn't been drafted", async () => {
    const { deps, statuses } = makeDeps({ status: "empty" });

    const result = await skipPlanSlot(deps, { userId: "u1", slotId: "slot-1" });

    expect(result.ok).toBe(true);
    expect(statuses).toEqual(["skipped"]);
  });

  it("refuses to skip an approved slot", async () => {
    const { deps, statuses } = makeDeps({ status: "approved" });

    const result = await skipPlanSlot(deps, { userId: "u1", slotId: "slot-1" });

    expect(result.ok).toBe(false);
    expect(statuses).toEqual([]);
  });

  it("puts a skipped slot back to empty", async () => {
    const { deps, statuses } = makeDeps({ status: "skipped" });

    const result = await restorePlanSlot(deps, { userId: "u1", slotId: "slot-1" });

    expect(result.ok).toBe(true);
    expect(statuses).toEqual(["empty"]);
  });

  it("refuses to restore a slot that was never skipped", async () => {
    const { deps, statuses } = makeDeps({ status: "ready" });

    const result = await restorePlanSlot(deps, { userId: "u1", slotId: "slot-1" });

    expect(result.ok).toBe(false);
    expect(statuses).toEqual([]);
  });
});

describe("removePlanSlot", () => {
  it("removes an uncommitted slot", async () => {
    const { deps, deleted } = makeDeps({ status: "ready" });

    const result = await removePlanSlot(deps, { userId: "u1", slotId: "slot-1" });

    expect(result.ok).toBe(true);
    expect(deleted).toEqual(["slot-1"]);
  });

  it("refuses to remove a slot whose post is already scheduled", async () => {
    const { deps, deleted } = makeDeps({ status: "approved" });

    const result = await removePlanSlot(deps, { userId: "u1", slotId: "slot-1" });

    expect(result.ok).toBe(false);
    expect(deleted).toEqual([]);
  });
});

describe("addPlanSlot", () => {
  const input = {
    userId: "u1",
    planId: "plan-1",
    topic: "An extra one",
    angle: "Something worth saying this week",
    format: "single" as const,
    targetAt: new Date("2026-08-12T09:00:00Z"),
  };

  it("appends a slot at the end of the week", async () => {
    const { deps, added } = makeDeps({ slotCount: 4 });

    const result = await addPlanSlot(deps, input);

    expect(result.ok).toBe(true);
    expect(added[0]).toMatchObject({ position: 4 });
  });

  it("refuses once the week is full", async () => {
    const { deps, added } = makeDeps({ slotCount: MAX_SLOTS_PER_PLAN });

    const result = await addPlanSlot(deps, input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation_failed");
    expect(added).toEqual([]);
  });

  it("will not let one account add to another account's plan", async () => {
    const { deps, added } = makeDeps({ owner: "acc-2" });

    const result = await addPlanSlot(deps, input);

    expect(result.ok).toBe(false);
    expect(added).toEqual([]);
  });
});
