"use client";

import { apiUrl } from "@/lib/api-url";
import type { VoiceProfileValue } from "@tweetbrainam/contracts";
import { useEffect, useState } from "react";
import { MemoryProfile } from "./memory-profile";
import { VoiceEditor } from "./voice-editor";

const POLL_INTERVAL_MS = 3000;

export function VoicePanel() {
  const [profile, setProfile] = useState<VoiceProfileValue | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [rebuildingFrom, setRebuildingFrom] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const response = await fetch(`${apiUrl}/v1/voice`, { credentials: "include" });
      if (!response.ok || cancelled) return;
      const body = (await response.json()) as { profile: VoiceProfileValue | null };
      if (cancelled) return;

      setHasChecked(true);
      setProfile(body.profile);
      if (body.profile && body.profile.id !== rebuildingFrom) setRebuildingFrom(null);
    }

    void poll();
    if (rebuildingFrom === null) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [rebuildingFrom]);

  async function handleRebuild(currentId: string) {
    setRebuildingFrom(currentId);
    await fetch(`${apiUrl}/v1/voice/rebuild`, { method: "POST", credentials: "include" });
  }

  if (!hasChecked) {
    return <p className="text-muted-foreground text-sm">Loading your voice…</p>;
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">
            We haven't worked out how you write yet. That happens once we've read enough of your
            posts.
          </p>
        </div>
        <MemoryProfile />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <VoiceEditor
        key={profile.id}
        profile={profile}
        isRebuilding={rebuildingFrom !== null}
        onRebuild={() => handleRebuild(profile.id)}
        onSaved={setProfile}
      />
      <MemoryProfile />
    </div>
  );
}
