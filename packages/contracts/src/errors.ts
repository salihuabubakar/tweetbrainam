import { z } from "zod";

export const errorCodes = [
  "unauthorized",
  "forbidden",
  "not_found",
  "validation_failed",
  "rate_limited",
  "quota_exceeded",
  "trial_expired",
  "conflict",
  "idempotency_replay",
  "onboarding_incomplete",
  "x_connection_revoked",
  "x_rate_limited",
  "draft_not_editable",
  "draft_not_approved",
  "schedule_conflict",
  "publish_failed",
  "generation_failed",
  "provider_unavailable",
  "internal",
] as const;

export const errorCodeSchema = z.enum(errorCodes);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    requestId: z.string(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
