export const metadata = { title: "Welcome" };

export default function OnboardingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">You're in</h1>
        <p className="text-muted-foreground text-sm">
          Your X account is connected. The onboarding flow — consent, analysis, and your Voice DNA —
          lands here next.
        </p>
      </div>
    </main>
  );
}
