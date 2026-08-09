"use client";

import { apiUrl } from "@/lib/api-url";
import { clearAllDurableState } from "@/lib/durable-state";
import { Button } from "@tweetbrainam/ui";
import { useState } from "react";

const CONFIRMATION = "DELETE";

const erasedItems = [
  "every post we read or you pasted in",
  "your voice profile and everything it learned",
  "your plans, drafts, and anything scheduled but not yet posted",
  "your X connection, revoked on X's side too",
];

export function DangerZone() {
  const [isOpen, setIsOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    const response = await fetch(`${apiUrl}/v1/settings/account`, {
      method: "DELETE",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: CONFIRMATION }),
    });

    if (!response.ok) {
      setError("We couldn't delete your account. Try again, or get in touch.");
      setIsDeleting(false);
      return;
    }

    clearAllDurableState();
    window.location.href = "/";
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-destructive text-sm">Delete your account</h2>
        <p className="text-muted-foreground text-sm">
          This erases everything and cannot be undone. Posts already published on X stay on X —
          they're yours, and we can't take them down.
        </p>
      </div>

      <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground text-sm">
        {erasedItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {isOpen ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm" htmlFor="delete-confirmation">
            Type <span className="font-mono font-semibold">{CONFIRMATION}</span> to confirm.
            <input
              id="delete-confirmation"
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={typed !== CONFIRMATION || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting…" : "Delete everything"}
            </Button>
            <Button
              variant="ghost"
              disabled={isDeleting}
              onClick={() => {
                setIsOpen(false);
                setTyped("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="self-start" onClick={() => setIsOpen(true)}>
          Delete my account
        </Button>
      )}
    </section>
  );
}
