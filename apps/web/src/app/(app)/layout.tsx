import { NavLink } from "@/components/shared/nav-link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/drafts", label: "Drafts" },
  { href: "/voice", label: "Voice" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
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
      </aside>
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
