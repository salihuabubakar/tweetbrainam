import { AnalyzingStep } from "@/components/onboarding/analyzing-step";
import { ConsentStep } from "@/components/onboarding/consent-step";
import { FirstDraftStep } from "@/components/onboarding/first-draft-step";
import { GoalsStep } from "@/components/onboarding/goals-step";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { PendingStep } from "@/components/onboarding/pending-step";
import { PlanStep } from "@/components/onboarding/plan-step";
import { VoiceStep } from "@/components/onboarding/voice-step";
import { requireUser } from "@/lib/session";
import {
  type OnboardingStepValue,
  canRevisitStep,
  onboardingStepSchema,
} from "@tweetbrainam/contracts";
import { redirect } from "next/navigation";

export const metadata = { title: "Get started" };

const copy: Record<OnboardingStepValue, { title: string; description: string }> = {
  consent: {
    title: "Before we read anything",
    description: "TweetBrainam learns your voice from your own posts. Here is exactly how.",
  },
  analyzing: {
    title: "Reading your posts",
    description: "We're learning how you write — tone, structure, topics, and rhythm.",
  },
  voice: {
    title: "Your Voice DNA",
    description: "Here's what we learned. Correct anything that doesn't sound like you.",
  },
  goals: {
    title: "What are you working toward?",
    description: "Your history tells us how you write. This tells us what to write about.",
  },
  plan: {
    title: "Your first week",
    description: "A plan shaped by your voice, your goals, and your cadence.",
  },
  first_draft: {
    title: "Your first draft",
    description: "Approve it, edit it, or ask for another. Nothing posts without you.",
  },
  done: { title: "You're set", description: "" },
};

function requestedStep(
  raw: string | string[] | undefined,
  furthest: OnboardingStepValue,
): OnboardingStepValue | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;

  const parsed = onboardingStepSchema.safeParse(value);
  if (!parsed.success) return null;

  return canRevisitStep(furthest, parsed.data) ? parsed.data : null;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const furthest = user.onboardingStep;
  if (furthest === "done") redirect("/today");

  const step = requestedStep((await searchParams).step, furthest) ?? furthest;

  return (
    <OnboardingShell
      current={step}
      furthest={furthest}
      title={copy[step].title}
      description={copy[step].description}
    >
      {step === "consent" ? <ConsentStep /> : null}
      {step === "analyzing" ? <AnalyzingStep /> : null}
      {step === "goals" ? <GoalsStep /> : null}
      {step === "voice" ? <VoiceStep /> : null}
      {step === "plan" ? <PlanStep /> : null}
      {step === "first_draft" ? <FirstDraftStep /> : null}
    </OnboardingShell>
  );
}
