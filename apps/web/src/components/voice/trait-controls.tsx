"use client";

import type { VoiceToneValue, VoiceTraitsValue } from "@tweetbrainam/contracts";
import { cn } from "@tweetbrainam/ui";

const MAX_TONES = 3;

const toneOptions: { value: VoiceToneValue; description: string }[] = [
  { value: "direct", description: "Says the thing without warming up" },
  { value: "conversational", description: "Writes like they're talking to you" },
  { value: "analytical", description: "Reasons through it in public" },
  { value: "playful", description: "Enjoys the joke" },
  { value: "warm", description: "Generous with the reader" },
  { value: "provocative", description: "Picks a side and defends it" },
];

const lengthOptions: { value: VoiceTraitsValue["averageSentenceLength"]; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
  { value: "varied", label: "Varied" },
];

function formalityLabel(value: number): string {
  if (value < 0.35) return "Casual";
  if (value > 0.65) return "Formal";
  return "In between";
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-border"
      />
      <span className="flex flex-col gap-0.5">
        <span>{label}</span>
        <span className="text-muted-foreground text-xs">{hint}</span>
      </span>
    </label>
  );
}

export function TraitControls({
  traits,
  onChange,
}: {
  traits: VoiceTraitsValue;
  onChange: (next: VoiceTraitsValue) => void;
}) {
  function toggleTone(tone: VoiceToneValue) {
    const selected = traits.tones.includes(tone);
    if (selected && traits.tones.length === 1) return;
    if (!selected && traits.tones.length >= MAX_TONES) return;
    onChange({
      ...traits,
      tones: selected ? traits.tones.filter((item) => item !== tone) : [...traits.tones, tone],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-sm">How you sound</legend>
        <p className="text-muted-foreground text-xs">
          Pick up to {MAX_TONES}. These shape every sentence we write as you.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {toneOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={traits.tones.includes(option.value)}
              onClick={() => toggleTone(option.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                traits.tones.includes(option.value)
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="block font-medium text-sm capitalize">{option.value}</span>
              <span className="block text-muted-foreground text-xs">{option.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="formality" className="font-medium text-sm">
          Register: {formalityLabel(traits.formality)}
        </label>
        <input
          id="formality"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={traits.formality}
          onChange={(event) => onChange({ ...traits, formality: Number(event.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-muted-foreground text-xs">
          <span>Casual</span>
          <span>Formal</span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-sm">Sentence length</legend>
        <div className="flex flex-wrap gap-2">
          {lengthOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={traits.averageSentenceLength === option.value}
              onClick={() => onChange({ ...traits, averageSentenceLength: option.value })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                traits.averageSentenceLength === option.value
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium text-sm">Habits</legend>
        <Toggle
          label="Use emoji"
          hint="Off by default — most accounts read better without them."
          checked={traits.usesEmoji}
          onChange={(usesEmoji) => onChange({ ...traits, usesEmoji })}
        />
        <Toggle
          label="Use hashtags"
          hint="Off by default. X buries them and readers skip them."
          checked={traits.usesHashtags}
          onChange={(usesHashtags) => onChange({ ...traits, usesHashtags })}
        />
      </fieldset>
    </div>
  );
}
