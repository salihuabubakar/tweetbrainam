import { cn } from "@tweetbrainam/ui";
import type { ReactNode } from "react";

const sidebarItems = ["Today", "Plan", "Drafts", "Voice", "Settings"];

export function AppFrame({
  active,
  children,
  className,
}: {
  active: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-foreground/5 shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-border border-b bg-muted px-3 py-2">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="ml-2 truncate text-[10px] text-muted-foreground">
          tweetbrainam.com/{active.toLowerCase()}
        </span>
      </div>

      <div className="flex min-h-72">
        <div className="hidden w-28 shrink-0 flex-col gap-1 border-border border-r p-2 sm:flex">
          <span className="px-2 py-1 font-semibold text-[10px]">TweetBrainam</span>
          {sidebarItems.map((item) => (
            <span
              key={item}
              className={cn(
                "rounded px-2 py-1 text-[10px]",
                item === active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-hidden p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
}
