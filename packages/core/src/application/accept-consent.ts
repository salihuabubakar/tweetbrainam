import { type DomainError, domainError } from "../domain/errors";
import type { OnboardingStep } from "../domain/onboarding";
import { type Result, err, ok } from "../lib/result";
import type { Clock } from "../ports/clock";
import type { IdentityRepository } from "../ports/identity-repository";
import type { JobRunner } from "../ports/job-runner";

export type AcceptConsentDeps = {
  identity: IdentityRepository;
  clock: Clock;
  jobs: JobRunner;
};

export async function acceptConsent(
  deps: AcceptConsentDeps,
  input: { userId: string },
): Promise<Result<{ onboardingStep: OnboardingStep }, DomainError>> {
  const user = await deps.identity.findUserById(input.userId);
  if (!user) return err(domainError("user_not_found", "Account not found."));
  if (user.onboardingStep !== "consent") {
    return err(domainError("onboarding_step_invalid", "Consent was already given."));
  }

  await deps.identity.recordConsent(user.id, deps.clock.now());
  await deps.identity.updateOnboardingStep(user.id, "analyzing");
  await deps.jobs.startAccountAnalysis(user.id);
  return ok({ onboardingStep: "analyzing" });
}
