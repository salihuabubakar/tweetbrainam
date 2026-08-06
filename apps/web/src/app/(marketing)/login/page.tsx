import { apiUrl } from "@/lib/api-url";
import { buttonVariants } from "@tweetbrainam/ui";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-border bg-card p-8 text-center">
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
      </div>
    </main>
  );
}
