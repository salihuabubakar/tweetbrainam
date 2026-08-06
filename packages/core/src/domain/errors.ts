export const domainErrorCodes = [
  "oauth_state_invalid",
  "oauth_exchange_failed",
  "x_connection_revoked",
  "user_not_found",
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
