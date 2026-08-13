import { z } from "zod";
import { contentGoalSchema } from "./user";

export const connectionStatusSchema = z.enum([
  "connected",
  "token_expired",
  "revoked",
  "rate_limited",
]);

export const usageMetricSchema = z.enum(["draft_generated", "plan_generated", "post_published"]);

export const planCodeSchema = z.enum(["trial", "free_beta", "pro", "team"]);

export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "expired",
  "canceled",
  "past_due",
]);

export const xAccountSummarySchema = z.object({
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  connectionStatus: connectionStatusSchema,
  connectedAt: z.coerce.date(),
});

export const usageLineSchema = z.object({
  metric: usageMetricSchema,
  used: z.number().int(),
  limit: z.number().int(),
  remaining: z.number().int(),
});

export const settingsSummarySchema = z.object({
  account: xAccountSummarySchema.nullable(),
  cadence: z.object({
    goal: contentGoalSchema.nullable(),
    postsPerWeek: z.number().int(),
    timezone: z.string(),
  }),
  plan: z.object({
    code: planCodeSchema,
    period: z.string(),
    status: subscriptionStatusSchema,
    trialEndsAt: z.coerce.date().nullable(),
    trialDaysRemaining: z.number().int(),
    isExpired: z.boolean(),
    usage: z.array(usageLineSchema),
  }),
});

export const updatePreferencesInputSchema = z.object({
  goal: contentGoalSchema,
  postsPerWeek: z.number().int().min(1).max(21),
  timezone: z.string().min(1),
});

export const deleteAccountInputSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export type ConnectionStatusValue = z.infer<typeof connectionStatusSchema>;
export type UsageMetricValue = z.infer<typeof usageMetricSchema>;
export type PlanCodeValue = z.infer<typeof planCodeSchema>;
export type XAccountSummaryValue = z.infer<typeof xAccountSummarySchema>;
export type UsageLineValue = z.infer<typeof usageLineSchema>;
export type SettingsSummaryValue = z.infer<typeof settingsSummarySchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
