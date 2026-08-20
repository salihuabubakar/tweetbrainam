import type { OnboardingStepValue, PlanCodeValue } from "@tweetbrainam/contracts";
import { redirect } from "next/navigation";
import { fetchFromApi } from "./server-api";

export type CurrentUser = {
  id: string;
  name: string;
  email: string | null;
  timezone: string;
  onboardingStep: OnboardingStepValue;
  hasSeenTour: boolean;
};

export type TrialState = {
  planCode: PlanCodeValue;
  isExpired: boolean;
  daysRemaining: number;
};

export type CurrentSession = {
  user: CurrentUser;
  trial: TrialState;
};

export async function getCurrentSession(): Promise<CurrentSession | null> {
  return fetchFromApi<CurrentSession>("/v1/me");
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOnboardedSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.onboardingStep !== "done") redirect("/onboarding");
  return session;
}

export async function requireOnboardedUser(): Promise<CurrentUser> {
  return (await requireOnboardedSession()).user;
}
