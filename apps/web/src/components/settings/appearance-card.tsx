"use client";

import { type ThemePreference, applyTheme, readThemePreference, resolveTheme } from "@/lib/theme";
import { cn } from "@tweetbrainam/ui";
import { useEffect, useState } from "react";

const options: { value: ThemePreference; label: string; description: string }[] = [
  { value: "system", label: "Match my system", description: "Follows your device setting" },
  { value: "light", label: "Light", description: "Always light" },
  { value: "dark", label: "Dark", description: "Always dark" },
];

export function AppearanceCard() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = readThemePreference();
    setPreference(stored);
    setResolved(resolveTheme(stored));
  }, []);

  useEffect(() => {
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      setResolved(resolveTheme("system"));
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  function choose(next: ThemePreference) {
    setPreference(next);
    applyTheme(next);
    setResolved(resolveTheme(next));
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">Appearance</h2>
        <p className="text-muted-foreground text-sm">
          {preference === "system"
            ? `Following your device, which is currently ${resolved}.`
            : `Always ${preference}, whatever your device is set to.`}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Theme</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preference === option.value}
              onClick={() => choose(option.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                preference === option.value
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="block font-medium text-sm">{option.label}</span>
              <span className="block text-muted-foreground text-xs">{option.description}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
