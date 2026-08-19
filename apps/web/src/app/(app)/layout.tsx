import { NavLink } from "@/components/shared/nav-link";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { Tour } from "@/components/shared/tour";
import { TrialBanner } from "@/components/shared/trial-banner";
import { requireOnboardedSession } from "@/lib/session";
import type { ReactNode } from "react";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/drafts", label: "Drafts" },
  { href: "/voice", label: "Voice" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, trial } = await requireOnboardedSession();

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <header className="flex items-center justify-between gap-3 border-border border-b px-4 py-3 md:hidden">
        <span className="font-semibold text-sm tracking-tight">TweetBrainam</span>
        <div className="flex items-center gap-3">
          <span className="max-w-32 truncate text-muted-foreground text-xs">{user.name}</span>
          <SignOutButton />
        </div>
      </header>

      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-border border-r px-3 py-5 md:sticky md:top-0 md:flex md:h-svh md:self-start md:overflow-y-auto">
        <span className="px-3 font-semibold text-sm tracking-tight">TweetBrainam</span>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-border border-t pt-4">
          <span className="truncate px-3 text-muted-foreground text-xs">{user.name}</span>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex w-full flex-1 flex-col">
        <TrialBanner trial={trial} />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex border-border border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} variant="tab">
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Tour />
    </div>
  );
}
