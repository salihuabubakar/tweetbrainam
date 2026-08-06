export const onboardingSteps = [
  "consent",
  "analyzing",
  "voice",
  "goals",
  "plan",
  "first_draft",
  "done",
] as const;

export type OnboardingStep = (typeof onboardingSteps)[number];

export type User = {
  id: string;
  email: string | null;
  name: string;
  timezone: string;
  onboardingStep: OnboardingStep;
};

export type XProfile = {
  xUserId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

export type EncryptedTokenSet = {
  accessTokenEnc: Uint8Array;
  refreshTokenEnc: Uint8Array;
  tokenExpiresAt: Date;
};
