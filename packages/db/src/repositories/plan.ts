import type { ContentPlan, PlanRepository } from "@tweetbrainam/core";
import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { type ContentPlanRow, type PlanSlotRow, contentPlans, planSlots } from "../schema";

const toDomainPlan = (plan: ContentPlanRow, slots: PlanSlotRow[]): ContentPlan => ({
  id: plan.id,
  weekStart: plan.weekStart,
  status: plan.status,
  rationale: plan.rationale,
  slots: slots.map((slot) => ({
    id: slot.id,
    topic: slot.topic,
    format: slot.format,
    angle: slot.angle,
    targetAt: slot.targetAt,
    status: slot.status,
    position: slot.position,
  })),
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

    async findSlotById(slotId) {
      const rows = await db.select().from(planSlots).where(eq(planSlots.id, slotId)).limit(1);
      const slot = rows[0];
      if (!slot) return null;
      return {
        id: slot.id,
        topic: slot.topic,
        format: slot.format,
        angle: slot.angle,
        targetAt: slot.targetAt,
        status: slot.status,
        position: slot.position,
      };
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

    async updateSlotStatus(slotId, status) {
      await db.update(planSlots).set({ status }).where(eq(planSlots.id, slotId));
    },
  };
}
