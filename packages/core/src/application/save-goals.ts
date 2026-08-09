import { type DomainError, domainError } from "../domain/errors";
import type { OnboardingStep } from "../domain/onboarding";
import type { UserGoals } from "../domain/onboarding";
import { type Result, err, ok } from "../lib/result";
import type { IdentityRepository } from "../ports/identity-repository";

export type SaveGoalsDeps = {
  identity: IdentityRepository;
};

export async function saveGoals(
  deps: SaveGoalsDeps,
  input: { userId: string; goals: UserGoals },
): Promise<Result<{ onboardingStep: OnboardingStep }, DomainError>> {
  const user = await deps.identity.findUserById(input.userId);
  if (!user) return err(domainError("user_not_found", "Account not found."));
  if (user.onboardingStep !== "goals") {
    return err(domainError("onboarding_step_invalid", "Goals can only be set at the goals step."));
  }

  await deps.identity.saveUserGoals(user.id, input.goals);
  await deps.identity.updateOnboardingStep(user.id, "plan");
  return ok({ onboardingStep: "plan" });
}
