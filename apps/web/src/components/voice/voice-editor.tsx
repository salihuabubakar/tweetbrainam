"use client";

import { apiUrl } from "@/lib/api-url";
import { useDurableState } from "@/lib/durable-state";
import type {
  EditVoiceProfileInput,
  VoiceProfileValue,
  VoiceTraitsValue,
} from "@tweetbrainam/contracts";
import { Button } from "@tweetbrainam/ui";
import { useState } from "react";
import { TagList } from "./tag-list";
import { TraitControls } from "./trait-controls";

const sourceLabels: Record<VoiceProfileValue["source"], string> = {
  analysis: "Learned from your posts",
  user_edit: "Edited by you",
  refinement: "Refined from your edits",
};

export function VoiceEditor({
  profile,
  isRebuilding,
  onRebuild,
  onSaved,
}: {
  profile: VoiceProfileValue;
  isRebuilding: boolean;
  onRebuild: () => void;
  onSaved: (next: VoiceProfileValue) => void;
}) {
  const {
    value: edit,
    setValue: setEdit,
    clear,
  } = useDurableState<EditVoiceProfileInput>(`voice.edit.${profile.id}`, {
    traits: profile.traits,
    topics: profile.topics,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = { traits: profile.traits, topics: profile.topics };
  const isDirty = JSON.stringify(edit) !== JSON.stringify(saved);

  function setTraits(traits: VoiceTraitsValue) {
    setEdit({ ...edit, traits });
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    const response = await fetch(`${apiUrl}/v1/voice`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(edit),
    });

    setIsSaving(false);
    if (!response.ok) {
      setError("We couldn't save that. Check you've kept at least one tone and one topic.");
      return;
    }

    const body = (await response.json()) as { profile: VoiceProfileValue };
    clear();
    onSaved(body.profile);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-muted-foreground text-sm">
          <span>
            Version {profile.version} · {sourceLabels[profile.source]}
          </span>
          <span>{profile.postsAnalyzed} posts read</span>
        </div>

        <p className="text-muted-foreground text-sm">
          Your edits here outrank the analysis. We follow them on every post we write as you.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={isRebuilding || isDirty} onClick={onRebuild}>
            {isRebuilding ? "Reading your posts…" : "Rebuild from my posts"}
          </Button>
          {isDirty ? (
            <span className="text-muted-foreground text-xs">
              Save or discard your changes first — rebuilding replaces everything below.
            </span>
          ) : null}
        </div>
      </div>

      <TraitControls traits={edit.traits} onChange={setTraits} />

      <TagList
        label="Rules we follow when writing as you"
        hint="The most direct control you have. Write them as instructions — 'never open with a question', 'always use British spelling'."
        placeholder="Never start a post with 'In today's world'"
        items={edit.traits.rules}
        max={10}
        onChange={(rules) => setTraits({ ...edit.traits, rules })}
      />

      <TagList
        label="Words and phrases that are yours"
        hint="Turns of phrase we should keep using — and ones we should never put in your mouth."
        placeholder="Says 'ship it' rather than 'launch'"
        items={edit.traits.vocabularyQuirks}
        max={10}
        onChange={(vocabularyQuirks) => setTraits({ ...edit.traits, vocabularyQuirks })}
      />

      <TagList
        label="Formats you favour"
        hint="Shapes your posts tend to take."
        placeholder="Short thread with a numbered list"
        items={edit.traits.favouriteFormats}
        max={6}
        onChange={(favouriteFormats) => setTraits({ ...edit.traits, favouriteFormats })}
      />

      <TagList
        label="What you write about"
        hint="We plan your week around these. Keep at least one."
        placeholder="Backend architecture"
        items={edit.topics}
        max={12}
        onChange={(topics) => setEdit({ ...edit, topics })}
      />

      {profile.sampleSentences.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-sm">Sentences that sound most like you</h2>
          <p className="text-muted-foreground text-xs">
            Pulled from your own posts. These aren't editable — they're the evidence, not the
            setting.
          </p>
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
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Button disabled={!isDirty || isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : `Save as version ${profile.version + 1}`}
        </Button>
        <Button variant="ghost" disabled={!isDirty || isSaving} onClick={clear}>
          Discard changes
        </Button>
        <span className="ml-auto text-muted-foreground text-xs">
          {isDirty ? "Unsaved changes" : "Up to date"}
        </span>
      </div>
    </div>
  );
}
