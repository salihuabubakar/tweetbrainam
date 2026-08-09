import { z } from "zod";
import { contentGoalSchema } from "./user";

export const onboardingStepSchema = z.enum([
  "consent",
  "analyzing",
  "voice",
  "goals",
  "plan",
  "first_draft",
  "done",
]);

export const saveGoalsInputSchema = z.object({
  goal: contentGoalSchema,
  postsPerWeek: z.number().int().min(1).max(21),
  timezone: z.string().min(1),
});

export const onboardingStateSchema = z.object({
  onboardingStep: onboardingStepSchema,
});

export const importPostsInputSchema = z.object({
  raw: z.string().min(1).max(200_000),
});

export type ImportPostsInput = z.infer<typeof importPostsInputSchema>;

export type OnboardingStepValue = z.infer<typeof onboardingStepSchema>;
export type SaveGoalsInput = z.infer<typeof saveGoalsInputSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
