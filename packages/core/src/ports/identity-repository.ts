import type { EncryptedTokenSet, User, XAccountSummary, XProfile } from "../domain/identity";
import type { OnboardingStep, UserGoals, UserPreferences } from "../domain/onboarding";

export type IdentityRepository = {
  findUserByXUserId(xUserId: string): Promise<User | null>;
  findUserById(userId: string): Promise<User | null>;
  createUserWithXAccount(input: {
    profile: XProfile;
    tokens: EncryptedTokenSet;
    scopes: string[];
  }): Promise<User>;
  updateXAccountTokens(xUserId: string, tokens: EncryptedTokenSet): Promise<void>;
  recordConsent(userId: string, at: Date): Promise<void>;
  // null clears it, which is how "replay the tour" works.
  recordTourCompleted(userId: string, at: Date | null): Promise<void>;
  updateOnboardingStep(userId: string, step: OnboardingStep): Promise<void>;
  saveUserGoals(userId: string, goals: UserGoals): Promise<void>;
  listActiveOnboardedUsers(): Promise<{ id: string; timezone: string }[]>;
  findXAccountSummary(userId: string): Promise<XAccountSummary | null>;
  savePreferences(
    userId: string,
    input: { timezone: string; preferences: UserPreferences },
  ): Promise<void>;
  deleteUser(userId: string): Promise<void>;
};
