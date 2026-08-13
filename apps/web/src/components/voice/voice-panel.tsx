"use client";

import { type Tab, TabBar } from "@/components/shared/tab-bar";
import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type { VoiceProfileValue } from "@tweetbrainam/contracts";
import { useCallback, useEffect, useState } from "react";
import { MemoryProfile } from "./memory-profile";
import { VoiceEditor, type VoiceSection } from "./voice-editor";

const POLL_INTERVAL_MS = 3000;

type VoiceTab = VoiceSection | "memory";

export function VoicePanel() {
  const [profile, setProfile] = useState<VoiceProfileValue | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [rebuildingFrom, setRebuildingFrom] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { value: tab, setValue: setTab } = useDurableState<VoiceTab>("voice.tab", "voice");

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

  const handleDirtyChange = useCallback((dirty: boolean) => setIsDirty(dirty), []);

  async function handleRebuild(currentId: string) {
    setRebuildingFrom(currentId);
    await fetch(`${apiUrl}/v1/voice/rebuild`, { method: "POST", credentials: "include" });
  }

  if (!hasChecked) {
    return <p className="text-muted-foreground text-sm">Loading your voice…</p>;
  }

  const tabs: Tab<VoiceTab>[] = [
    { value: "voice", label: "How you write", hasUnsaved: isDirty && tab !== "voice" },
    { value: "topics", label: "What you write about", hasUnsaved: isDirty && tab !== "topics" },
    { value: "memory", label: "What we know" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <TabBar tabs={tabs} active={tab} onSelect={setTab} label="Voice sections" />

      {tab === "memory" ? (
        <MemoryProfile />
      ) : profile ? (
        <VoiceEditor
          key={profile.id}
          profile={profile}
          section={tab}
          isRebuilding={rebuildingFrom !== null}
          onRebuild={() => handleRebuild(profile.id)}
          onSaved={setProfile}
          onDirtyChange={handleDirtyChange}
        />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">
            We haven't worked out how you write yet. That happens once we've read enough of your
            posts.
          </p>
        </div>
      )}
    </div>
  );
}
