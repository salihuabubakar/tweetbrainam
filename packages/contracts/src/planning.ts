import { z } from "zod";

export const postFormatSchema = z.enum(["single", "thread"]);

export const slotStatusSchema = z.enum([
  "empty",
  "drafting",
  "ready",
  "approved",
  "published",
  "skipped",
]);

export const slotTopicSchema = z.string().min(3).max(120);
export const slotAngleSchema = z.string().min(10).max(400);

export const plannedSlotSchema = z.object({
  topic: slotTopicSchema,
  format: postFormatSchema,
  angle: slotAngleSchema,
});

export const weeklyPlanAnalysisSchema = z.object({
  rationale: z.string().min(10).max(600),
  slots: z.array(plannedSlotSchema).min(1).max(21),
});

export const planSlotSchema = plannedSlotSchema.extend({
  id: z.string(),
  targetAt: z.string(),
  status: slotStatusSchema,
  position: z.number().int(),
});

export const updatePlanSlotInputSchema = z
  .object({
    topic: slotTopicSchema.optional(),
    angle: slotAngleSchema.optional(),
    format: postFormatSchema.optional(),
    targetAt: z.coerce.date().optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: "Nothing to change.",
  });

export const addPlanSlotInputSchema = z.object({
  topic: slotTopicSchema,
  angle: slotAngleSchema,
  format: postFormatSchema.default("single"),
  targetAt: z.coerce.date(),
});

export const contentPlanSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  status: z.enum(["draft", "active", "completed"]),
  rationale: z.string(),
  slots: z.array(planSlotSchema),
});

export type PostFormatValue = z.infer<typeof postFormatSchema>;
export type SlotStatusValue = z.infer<typeof slotStatusSchema>;
export type WeeklyPlanAnalysis = z.infer<typeof weeklyPlanAnalysisSchema>;
export type PlanSlotValue = z.infer<typeof planSlotSchema>;
export type ContentPlanValue = z.infer<typeof contentPlanSchema>;
export type UpdatePlanSlotInput = z.infer<typeof updatePlanSlotInputSchema>;
export type AddPlanSlotInput = z.infer<typeof addPlanSlotInputSchema>;
