"use client";

import { apiUrl } from "@/lib/api-url";
import type { VoiceProfileValue } from "@tweetbrainam/contracts";
import { Button } from "@tweetbrainam/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 3000;

function Chips({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VoiceStep() {
  const router = useRouter();
  const [profile, setProfile] = useState<VoiceProfileValue | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const response = await fetch(`${apiUrl}/v1/voice`, { credentials: "include" });
      if (!response.ok || cancelled) return;
      const body = (await response.json()) as { profile: VoiceProfileValue | null };
      if (body.profile) setProfile(body.profile);
    }

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function handleContinue() {
    setIsBusy(true);
    await fetch(`${apiUrl}/v1/onboarding/advance`, { method: "POST", credentials: "include" });
    router.refresh();
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
          Working out how you write… this takes a few seconds.
        </div>
        <Button size="lg" disabled>
          Looks right
        </Button>
      </div>
    );
  }

  const { traits } = profile;
  const formality =
    traits.formality < 0.35 ? "Casual" : traits.formality > 0.65 ? "Formal" : "In between";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
        <Chips label="You sound" items={traits.tones} />

        <div className="flex flex-col gap-2">
          <span className="font-medium text-sm">Register</span>
          <p className="text-muted-foreground text-sm">
            {formality} · {traits.averageSentenceLength} sentences ·{" "}
            {traits.usesEmoji ? "uses emoji" : "no emoji"} ·{" "}
            {traits.usesHashtags ? "uses hashtags" : "no hashtags"}
          </p>
        </div>

        <Chips label="You write about" items={profile.topics} />
        <Chips label="Formats you favour" items={traits.favouriteFormats} />

        {traits.vocabularyQuirks.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">Habits we noticed</span>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground text-sm">
              {traits.vocabularyQuirks.map((quirk) => (
                <li key={quirk}>{quirk}</li>
              ))}
            </ul>
          </div>
        )}

        {traits.rules.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">Rules we'll follow when writing as you</span>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground text-sm">
              {traits.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        )}

        {profile.sampleSentences.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">Sentences that sound most like you</span>
            <div className="flex flex-col gap-2">
              {profile.sampleSentences.map((sentence) => (
                <blockquote
                  key={sentence}
                  className="border-border border-l-2 pl-3 text-muted-foreground text-sm italic"
                >
                  {sentence}
                </blockquote>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Not quite right? You'll be able to edit every part of this from the Voice page — and your
        edits teach us more than the analysis does.
      </p>

      <Button size="lg" disabled={isBusy} onClick={handleContinue}>
        {isBusy ? "Working…" : "Looks right"}
      </Button>
    </div>
  );
}
