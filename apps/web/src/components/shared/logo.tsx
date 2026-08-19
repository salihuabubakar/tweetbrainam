import { cn } from "@tweetbrainam/ui";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="14 18 38 32"
      role="img"
      aria-label="TweetBrainam"
      className={cn("size-6 text-foreground", className)}
    >
      <path
        d="M18 22h28M32 22v22"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="46" cy="44" r="4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-semibold text-base tracking-tight">TweetBrainam</span>
    </span>
  );
}
