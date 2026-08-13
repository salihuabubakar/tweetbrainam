import type { ContentPlan, PlanSlot, PostFormat, SlotStatus } from "../domain/planning";

export type NewPlanSlot = {
  topic: string;
  format: PostFormat;
  angle: string;
  targetAt: Date;
  position: number;
};

export type SavePlanInput = {
  xAccountId: string;
  weekStart: string;
  rationale: string;
  slots: NewPlanSlot[];
};

export type SlotPatch = {
  topic?: string | undefined;
  angle?: string | undefined;
  format?: PostFormat | undefined;
  targetAt?: Date | undefined;
};

export type PlanRepository = {
  findPlanByWeek(xAccountId: string, weekStart: string): Promise<ContentPlan | null>;
  findPlanById(planId: string): Promise<ContentPlan | null>;
  findSlotById(slotId: string): Promise<PlanSlot | null>;
  findAccountIdForSlot(slotId: string): Promise<string | null>;
  findAccountIdForPlan(planId: string): Promise<string | null>;
  countSlots(planId: string): Promise<number>;
  savePlan(input: SavePlanInput): Promise<ContentPlan>;
  addSlot(planId: string, slot: NewPlanSlot): Promise<PlanSlot>;
  updateSlot(slotId: string, patch: SlotPatch): Promise<PlanSlot | null>;
  updateSlotStatus(slotId: string, status: SlotStatus): Promise<void>;
  deleteSlot(slotId: string): Promise<void>;
};
