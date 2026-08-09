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

export type PlanRepository = {
  findPlanByWeek(xAccountId: string, weekStart: string): Promise<ContentPlan | null>;
  findSlotById(slotId: string): Promise<PlanSlot | null>;
  savePlan(input: SavePlanInput): Promise<ContentPlan>;
  updateSlotStatus(slotId: string, status: SlotStatus): Promise<void>;
};
