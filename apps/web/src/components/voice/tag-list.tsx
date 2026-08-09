"use client";

import { Button } from "@tweetbrainam/ui";
import { useState } from "react";

type TagListProps = {
  label: string;
  hint: string;
  placeholder: string;
  items: string[];
  max: number;
  onChange: (next: string[]) => void;
};

export function TagList({ label, hint, placeholder, items, max, onChange }: TagListProps) {
  const [entry, setEntry] = useState("");
  const isFull = items.length >= max;

  function add() {
    const value = entry.trim();
    if (!value || isFull || items.includes(value)) return;
    onChange([...items, value]);
    setEntry("");
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-medium text-sm">{label}</legend>
      <p className="text-muted-foreground text-xs">{hint}</p>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <span>{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((existing) => existing !== item))}
                className="text-muted-foreground text-xs hover:text-destructive"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <input
          value={entry}
          disabled={isFull}
          placeholder={isFull ? `That's the maximum of ${max}.` : placeholder}
          onChange={(event) => setEntry(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button variant="outline" disabled={isFull || entry.trim().length === 0} onClick={add}>
          Add
        </Button>
      </div>
    </fieldset>
  );
}
