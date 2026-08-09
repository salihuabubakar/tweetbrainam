"use client";

import { apiUrl } from "@/lib/api-url";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

const promises = [
  { we: "We read", detail: "your public posts and replies, to learn how you write." },
  { we: "We never post", detail: "anything without your explicit approval. Not once." },
  { we: "We store", detail: "your analysis privately. You can view, edit, or delete it anytime." },
  { we: "You leave", detail: "whenever you want — deleting your account erases everything." },
];

export function ConsentStep() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setIsSubmitting(true);
    setError(null);
    const response = await fetch(`${apiUrl}/v1/onboarding/consent`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      setError("We couldn't save your consent. Please try again.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {promises.map((item) => (
          <li key={item.we} className="rounded-lg border border-border bg-card p-4 text-sm">
            <span className="font-medium">{item.we}</span>{" "}
            <span className="text-muted-foreground">{item.detail}</span>
          </li>
        ))}
      </ul>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 size-4 rounded border-border accent-primary"
        />
        <span>I understand and give TweetBrainam permission to analyze my X activity.</span>
      </label>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button size="lg" disabled={!agreed || isSubmitting} onClick={handleContinue}>
        {isSubmitting ? "Saving…" : "Continue"}
      </Button>
    </div>
  );
}
