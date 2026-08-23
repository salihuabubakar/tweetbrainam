import { IosOAuthHint } from "@/components/marketing/ios-oauth-hint";
import { Logo } from "@/components/shared/logo";
import { apiUrl } from "@/lib/api-url";
import { getCurrentUser } from "@/lib/session";
import { buttonVariants } from "@tweetbrainam/ui";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardingStep === "done" ? "/today" : "/onboarding");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-border bg-card p-6 text-center sm:p-8">
        <Link href="/" aria-label="TweetBrainam home">
          <Logo />
        </Link>

        <h1 className="font-semibold text-2xl tracking-tight">Welcome to TweetBrainam</h1>
        <p className="text-muted-foreground text-sm">
          Sign in with your X account. We only read your posts to learn your voice — we never post
          without your approval.
        </p>
        <a
          href={`${apiUrl}/v1/auth/x/start`}
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Continue with X
        </a>

        <IosOAuthHint />

        <Link
          href="/"
          className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
