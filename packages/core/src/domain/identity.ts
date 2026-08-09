import type { OnboardingStep, UserPreferences } from "./onboarding";

export type User = {
  id: string;
  email: string | null;
  name: string;
  timezone: string;
  onboardingStep: OnboardingStep;
  preferences: UserPreferences | null;
};

export type XProfile = {
  xUserId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

export const connectionStatuses = [
  "connected",
  "token_expired",
  "revoked",
  "rate_limited",
] as const;

export type ConnectionStatus = (typeof connectionStatuses)[number];

export type XAccountSummary = {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  connectionStatus: ConnectionStatus;
  connectedAt: Date;
};

export type EncryptedTokenSet = {
  accessTokenEnc: Uint8Array;
  refreshTokenEnc: Uint8Array;
  tokenExpiresAt: Date;
};
