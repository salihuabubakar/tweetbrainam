import { z } from "zod";

export const contentGoals = ["grow_audience", "build_in_public", "authority", "leads"] as const;

export const contentGoalSchema = z.enum(contentGoals);

export const postingWindowSchema = z.object({
  day: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
});

export const userPreferencesSchema = z.object({
  goal: contentGoalSchema.optional(),
  postsPerWeek: z.number().int().min(1).max(21).default(5),
  postingWindows: z.array(postingWindowSchema).default([]),
});

export type ContentGoal = z.infer<typeof contentGoalSchema>;
export type PostingWindow = z.infer<typeof postingWindowSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
