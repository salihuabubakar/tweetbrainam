"use client";

import { apiUrl } from "@/lib/api-url";
import { clearAllDurableState } from "@/lib/durable-state";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await fetch(`${apiUrl}/v1/auth/logout`, { method: "POST", credentials: "include" });
    clearAllDurableState();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={handleSignOut}
      className="rounded-md px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
