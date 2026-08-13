import { z } from "zod";
import { postFormatSchema, slotAngleSchema, slotTopicSchema } from "./planning";

export const draftSegmentSchema = z.object({
  text: z.string().min(1).max(280),
});

export const draftContentSchema = z.object({
  segments: z.array(draftSegmentSchema).min(1).max(25),
});

export const draftStatusSchema = z.enum([
  "generating",
  "needs_review",
  "approved",
  "rejected",
  "archived",
  "failed",
]);

export const draftVersionSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  segments: z.array(draftSegmentSchema),
  author: z.enum(["ai", "user"]),
});

export const draftSchema = z.object({
  id: z.string(),
  planSlotId: z.string().nullable(),
  status: draftStatusSchema,
  currentVersion: draftVersionSchema.nullable(),
});

export const draftListItemSchema = draftSchema.extend({
  topic: z.string().nullable(),
  targetAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
});

export const editDraftInputSchema = z.object({
  segments: z.array(draftSegmentSchema).min(1).max(25),
});

export const regenerateDraftInputSchema = z.object({
  guidance: z.string().max(500).optional(),
});

export const createDraftInputSchema = z.object({
  topic: slotTopicSchema,
  angle: slotAngleSchema,
  format: postFormatSchema.default("single"),
  guidance: z.string().max(500).optional(),
});

export const rejectDraftInputSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type DraftSegmentValue = z.infer<typeof draftSegmentSchema>;
export type DraftContentValue = z.infer<typeof draftContentSchema>;
export type DraftStatusValue = z.infer<typeof draftStatusSchema>;
export type DraftValue = z.infer<typeof draftSchema>;
export type DraftListItemValue = z.infer<typeof draftListItemSchema>;
export type CreateDraftInput = z.infer<typeof createDraftInputSchema>;
