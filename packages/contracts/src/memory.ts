import { z } from "zod";

export const memoryCategorySchema = z.enum([
  "project",
  "audience",
  "expertise",
  "goal",
  "opinion",
  "preference",
]);

export const memorySourceSchema = z.enum(["extracted", "user_provided"]);

export const memoryStatusSchema = z.enum(["active", "archived"]);

export const memoryFactSchema = z.object({
  id: z.string(),
  category: memoryCategorySchema,
  content: z.string(),
  confidence: z.number(),
  source: memorySourceSchema,
  status: memoryStatusSchema,
  sourcePostIds: z.array(z.string()),
  createdAt: z.coerce.date(),
});

export const memoryExtractionSchema = z.object({
  facts: z
    .array(
      z.object({
        category: memoryCategorySchema,
        content: z.string().min(4).max(200),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(30),
});

export const addMemoryFactInputSchema = z.object({
  category: memoryCategorySchema,
  content: z.string().min(4).max(200),
});

export const updateMemoryFactInputSchema = z.object({
  category: memoryCategorySchema.optional(),
  content: z.string().min(4).max(200).optional(),
});

export type MemoryCategoryValue = z.infer<typeof memoryCategorySchema>;
export type MemoryStatusValue = z.infer<typeof memoryStatusSchema>;
export type MemoryFactValue = z.infer<typeof memoryFactSchema>;
export type MemoryExtraction = z.infer<typeof memoryExtractionSchema>;
export type AddMemoryFactInput = z.infer<typeof addMemoryFactInputSchema>;
export type UpdateMemoryFactInput = z.infer<typeof updateMemoryFactInputSchema>;
