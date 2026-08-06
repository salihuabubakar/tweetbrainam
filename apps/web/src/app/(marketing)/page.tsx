import { buttonVariants } from "@tweetbrainam/ui";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-border px-3 py-1 text-muted-foreground text-xs">
          Private beta
        </span>
        <h1 className="text-balance font-semibold text-5xl tracking-tight">
          Your AI Content Brain for X
        </h1>
        <p className="text-balance text-lg text-muted-foreground">
          TweetBrainam learns your voice from your own posts, plans your week, and drafts content
          that sounds like you. You approve every post — always.
        </p>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign in with X
        </Link>
      </div>
    </main>
  );
}
