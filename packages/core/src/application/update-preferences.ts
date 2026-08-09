import { type DomainError, domainError } from "../domain/errors";
import type { ContentGoal, UserPreferences } from "../domain/onboarding";
import { type Result, err, ok } from "../lib/result";
import type { IdentityRepository } from "../ports/identity-repository";

export const MIN_POSTS_PER_WEEK = 1;
export const MAX_POSTS_PER_WEEK = 21;

export type UpdatePreferencesDeps = {
  identity: IdentityRepository;
};

export type UpdatePreferencesInput = {
  userId: string;
  goal: ContentGoal;
  postsPerWeek: number;
  timezone: string;
};

export async function updatePreferences(
  deps: UpdatePreferencesDeps,
  input: UpdatePreferencesInput,
): Promise<Result<{ preferences: UserPreferences; timezone: string }, DomainError>> {
  const user = await deps.identity.findUserById(input.userId);
  if (!user) return err(domainError("user_not_found", "Account not found."));

  if (input.postsPerWeek < MIN_POSTS_PER_WEEK || input.postsPerWeek > MAX_POSTS_PER_WEEK) {
    return err(
      domainError(
        "validation_failed",
        `Pick between ${MIN_POSTS_PER_WEEK} and ${MAX_POSTS_PER_WEEK} pieces a week.`,
      ),
    );
  }

  const cadenceChanged = user.preferences?.postsPerWeek !== input.postsPerWeek;
  const timezoneChanged = user.timezone !== input.timezone;

  const preferences: UserPreferences = {
    goal: input.goal,
    postsPerWeek: input.postsPerWeek,
    postingWindows:
      cadenceChanged || timezoneChanged ? [] : (user.preferences?.postingWindows ?? []),
  };

  await deps.identity.savePreferences(user.id, { timezone: input.timezone, preferences });
  return ok({ preferences, timezone: input.timezone });
}
