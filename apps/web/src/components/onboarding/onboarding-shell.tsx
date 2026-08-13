import { type OnboardingStepValue, canRevisitStep } from "@tweetbrainam/contracts";
import { cn } from "@tweetbrainam/ui";
import Link from "next/link";
import type { ReactNode } from "react";

const visibleSteps: { step: OnboardingStepValue; label: string }[] = [
  { step: "consent", label: "Consent" },
  { step: "analyzing", label: "Analysis" },
  { step: "voice", label: "Voice" },
  { step: "goals", label: "Goals" },
  { step: "plan", label: "Plan" },
  { step: "first_draft", label: "First draft" },
];

export function OnboardingShell({
  current,
  furthest,
  title,
  description,
  children,
}: {
  current: OnboardingStepValue;
  furthest: OnboardingStepValue;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const currentIndex = visibleSteps.findIndex((item) => item.step === current);
  const furthestIndex = visibleSteps.findIndex((item) => item.step === furthest);
  const isLookingBack = currentIndex < furthestIndex;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Onboarding progress">
          {visibleSteps.map((item, index) => {
            const isLinked = canRevisitStep(furthest, item.step) && item.step !== current;

            const bar = (
              <span
                aria-hidden
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  index <= furthestIndex ? "bg-primary" : "bg-muted",
                  index === currentIndex && "ring-2 ring-ring ring-offset-1 ring-offset-background",
                )}
              />
            );

            return (
              <li key={item.step} className="flex flex-1 flex-col gap-1.5">
                {isLinked ? (
                  <Link href={`/onboarding?step=${item.step}`} aria-label={`Back to ${item.label}`}>
                    {bar}
                  </Link>
                ) : (
                  bar
                )}
                <span
                  className={cn(
                    "hidden text-xs sm:block",
                    index === currentIndex
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {isLinked ? (
                    <Link href={`/onboarding?step=${item.step}`} className="hover:text-foreground">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        <span className="text-muted-foreground text-xs sm:hidden">
          Step {currentIndex + 1} of {visibleSteps.length} · {visibleSteps[currentIndex]?.label}
        </span>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      {isLookingBack ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <span className="text-muted-foreground text-sm">
            You're looking back at an earlier step. Nothing here is lost.
          </span>
          <Link
            href={`/onboarding?step=${furthest}`}
            className="font-medium text-sm underline underline-offset-4"
          >
            Back to {visibleSteps[furthestIndex]?.label}
          </Link>
        </div>
      ) : null}

      {children}
    </main>
  );
}
