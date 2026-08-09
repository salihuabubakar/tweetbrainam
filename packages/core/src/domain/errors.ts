export const domainErrorCodes = [
  "oauth_state_invalid",
  "oauth_exchange_failed",
  "x_connection_revoked",
  "user_not_found",
  "onboarding_step_invalid",
  "ingestion_failed",
  "insufficient_posts",
  "generation_failed",
  "voice_profile_missing",
  "not_found",
  "draft_not_editable",
  "draft_not_approved",
  "publish_failed",
  "publish_canceled",
  "quota_exceeded",
  "validation_failed",
] as const;

export type DomainErrorCode = (typeof domainErrorCodes)[number];

export type DomainError = {
  code: DomainErrorCode;
  message: string;
};

export const domainError = (code: DomainErrorCode, message: string): DomainError => ({
  code,
  message,
});
