import { type DomainError, domainError } from "../domain/errors";
import type { OnboardingStep } from "../domain/onboarding";
import { autoAdvanceableSteps, nextOnboardingStep } from "../domain/onboarding";
import { type Result, err, ok } from "../lib/result";
import type { IdentityRepository } from "../ports/identity-repository";

export type AdvanceOnboardingDeps = {
  identity: IdentityRepository;
};

export async function advanceOnboarding(
  deps: AdvanceOnboardingDeps,
  input: { userId: string },
): Promise<Result<{ onboardingStep: OnboardingStep }, DomainError>> {
  const user = await deps.identity.findUserById(input.userId);
  if (!user) return err(domainError("user_not_found", "Account not found."));

  if (!autoAdvanceableSteps.includes(user.onboardingStep)) {
    return err(
      domainError("onboarding_step_invalid", `Cannot advance from "${user.onboardingStep}".`),
    );
  }

  const next = nextOnboardingStep[user.onboardingStep];
  if (!next) return err(domainError("onboarding_step_invalid", "Onboarding is already complete."));

  await deps.identity.updateOnboardingStep(user.id, next);
  return ok({ onboardingStep: next });
}
