import type { OnboardingStepValue } from "@tweetbrainam/contracts";
import { redirect } from "next/navigation";
import { fetchFromApi } from "./server-api";

export type CurrentUser = {
  id: string;
  name: string;
  email: string | null;
  timezone: string;
  onboardingStep: OnboardingStepValue;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetchFromApi<{ user: CurrentUser }>("/v1/me");
  return response?.user ?? null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.onboardingStep !== "done") redirect("/onboarding");
  return user;
}
