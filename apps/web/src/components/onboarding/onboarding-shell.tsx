import type { OnboardingStepValue } from "@tweetbrainam/contracts";
import { cn } from "@tweetbrainam/ui";
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
  title,
  description,
  children,
}: {
  current: OnboardingStepValue;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const currentIndex = visibleSteps.findIndex((item) => item.step === current);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-8 px-6 py-12">
      <ol className="flex items-center gap-2" aria-label="Onboarding progress">
        {visibleSteps.map((item, index) => (
          <li key={item.step} className="flex flex-1 flex-col gap-1.5">
            <span
              aria-hidden
              className={cn("h-1 rounded-full", index <= currentIndex ? "bg-primary" : "bg-muted")}
            />
            <span
              className={cn(
                "text-xs",
                index === currentIndex ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>

      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      {children}
    </main>
  );
}
