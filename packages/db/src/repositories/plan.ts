import type { ContentPlan, PlanRepository, PlanSlot } from "@tweetbrainam/core";
import { and, asc, count, eq } from "drizzle-orm";
import type { Database } from "../client";
import { type ContentPlanRow, type PlanSlotRow, contentPlans, planSlots } from "../schema";

const toDomainSlot = (slot: PlanSlotRow): PlanSlot => ({
  id: slot.id,
  topic: slot.topic,
  format: slot.format,
  angle: slot.angle,
  targetAt: slot.targetAt,
  status: slot.status,
  position: slot.position,
});

const toDomainPlan = (plan: ContentPlanRow, slots: PlanSlotRow[]): ContentPlan => ({
  id: plan.id,
  weekStart: plan.weekStart,
  status: plan.status,
  rationale: plan.rationale,
  slots: slots.map(toDomainSlot),
});

export function createPlanRepository(db: Database): PlanRepository {
  return {
    async findPlanByWeek(xAccountId, weekStart) {
      const rows = await db
        .select()
        .from(contentPlans)
        .where(and(eq(contentPlans.xAccountId, xAccountId), eq(contentPlans.weekStart, weekStart)))
        .limit(1);

      const plan = rows[0];
      if (!plan) return null;

      const slots = await db
        .select()
        .from(planSlots)
        .where(eq(planSlots.contentPlanId, plan.id))
        .orderBy(asc(planSlots.position));

      return toDomainPlan(plan, slots);
    },

    async findPlanById(planId) {
      const rows = await db.select().from(contentPlans).where(eq(contentPlans.id, planId)).limit(1);
      const plan = rows[0];
      if (!plan) return null;

      const slots = await db
        .select()
        .from(planSlots)
        .where(eq(planSlots.contentPlanId, plan.id))
        .orderBy(asc(planSlots.position));

      return toDomainPlan(plan, slots);
    },

    async findSlotById(slotId) {
      const rows = await db.select().from(planSlots).where(eq(planSlots.id, slotId)).limit(1);
      const slot = rows[0];
      return slot ? toDomainSlot(slot) : null;
    },

    async findAccountIdForSlot(slotId) {
      const rows = await db
        .select({ xAccountId: contentPlans.xAccountId })
        .from(planSlots)
        .innerJoin(contentPlans, eq(planSlots.contentPlanId, contentPlans.id))
        .where(eq(planSlots.id, slotId))
        .limit(1);
      return rows[0]?.xAccountId ?? null;
    },

    async findAccountIdForPlan(planId) {
      const rows = await db
        .select({ xAccountId: contentPlans.xAccountId })
        .from(contentPlans)
        .where(eq(contentPlans.id, planId))
        .limit(1);
      return rows[0]?.xAccountId ?? null;
    },

    async countSlots(planId) {
      const rows = await db
        .select({ value: count() })
        .from(planSlots)
        .where(eq(planSlots.contentPlanId, planId));
      return rows[0]?.value ?? 0;
    },

    async savePlan(input) {
      return db.transaction(async (tx) => {
        const inserted = await tx
          .insert(contentPlans)
          .values({
            xAccountId: input.xAccountId,
            weekStart: input.weekStart,
            rationale: input.rationale,
            status: "active",
          })
          .returning();

        const plan = inserted[0];
        if (!plan) throw new Error("Content plan insert returned no row.");

        const slots =
          input.slots.length === 0
            ? []
            : await tx
                .insert(planSlots)
                .values(
                  input.slots.map((slot) => ({
                    contentPlanId: plan.id,
                    topic: slot.topic,
                    format: slot.format,
                    angle: slot.angle,
                    targetAt: slot.targetAt,
                    position: slot.position,
                  })),
                )
                .returning();

        return toDomainPlan(
          plan,
          [...slots].sort((a, b) => a.position - b.position),
        );
      });
    },

    async addSlot(planId, slot) {
      const inserted = await db
        .insert(planSlots)
        .values({
          contentPlanId: planId,
          topic: slot.topic,
          format: slot.format,
          angle: slot.angle,
          targetAt: slot.targetAt,
          position: slot.position,
        })
        .returning();

      const row = inserted[0];
      if (!row) throw new Error("Plan slot insert returned no row.");
      return toDomainSlot(row);
    },

    async updateSlot(slotId, patch) {
      const updated = await db
        .update(planSlots)
        .set({
          ...(patch.topic ? { topic: patch.topic } : {}),
          ...(patch.angle ? { angle: patch.angle } : {}),
          ...(patch.format ? { format: patch.format } : {}),
          ...(patch.targetAt ? { targetAt: patch.targetAt } : {}),
        })
        .where(eq(planSlots.id, slotId))
        .returning();

      const row = updated[0];
      return row ? toDomainSlot(row) : null;
    },

    async updateSlotStatus(slotId, status) {
      await db.update(planSlots).set({ status }).where(eq(planSlots.id, slotId));
    },

    async deleteSlot(slotId) {
      await db.delete(planSlots).where(eq(planSlots.id, slotId));
    },
  };
}
