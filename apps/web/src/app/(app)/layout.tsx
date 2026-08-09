import { NavLink } from "@/components/shared/nav-link";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { requireOnboardedUser } from "@/lib/session";
import type { ReactNode } from "react";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/drafts", label: "Drafts" },
  { href: "/voice", label: "Voice" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireOnboardedUser();

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-56 flex-col gap-6 border-border border-r px-3 py-5">
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
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
