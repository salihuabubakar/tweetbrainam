"use client";

import { Modal } from "@/components/shared/modal";
import { apiUrl } from "@/lib/api-url";
import { clearAllDurableState } from "@/lib/durable-state";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await fetch(`${apiUrl}/v1/auth/logout`, { method: "POST", credentials: "include" });
    clearAllDurableState();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="rounded-md px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Sign out
      </button>

      <Modal
        isOpen={isConfirming}
        onClose={() => !isSigningOut && setIsConfirming(false)}
        title="Sign out of TweetBrainam?"
        description="Anything you've published or scheduled stays exactly as it is. Draft edits you haven't saved yet are kept on this device only, and signing out clears them."
      >
        <div className="flex gap-2">
          <Button disabled={isSigningOut} onClick={handleSignOut}>
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
          <Button variant="ghost" disabled={isSigningOut} onClick={() => setIsConfirming(false)}>
            Stay signed in
          </Button>
        </div>
      </Modal>
    </>
  );
}
