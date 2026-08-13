"use client";

import { cn } from "@tweetbrainam/ui";

export type Tab<T extends string> = {
  value: T;
  label: string;
  hasUnsaved?: boolean;
};

export function TabBar<T extends string>({
  tabs,
  active,
  onSelect,
  label,
}: {
  tabs: Tab<T>[];
  active: T;
  onSelect: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onSelect(tab.value)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
            active === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {tab.hasUnsaved ? (
            <span aria-label="unsaved changes" className="size-1.5 rounded-full bg-primary" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
