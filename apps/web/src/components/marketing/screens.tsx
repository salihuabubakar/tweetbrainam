import { cn } from "@tweetbrainam/ui";
import type { ReactNode } from "react";

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3 flex flex-col gap-0.5">
      <span className="font-semibold text-sm">{title}</span>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone?: "accent" | "muted" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px]",
        tone === "accent" ? "bg-accent text-accent-foreground" : "border border-border",
      )}
    >
      {children}
    </span>
  );
}

function FakeButton({ children, variant }: { children: ReactNode; variant?: "primary" }) {
  return (
    <span
      className={cn(
        "rounded-md px-2.5 py-1 text-[10px]",
        variant === "primary"
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function AnalysisScreen() {
  return (
    <div className="flex flex-col">
      <Heading title="Reading your posts" sub="We learn how you write before writing anything" />
      <div className="flex flex-col gap-2">
        {[100, 78, 92, 64].map((width, index) => (
          <div key={width} className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            <span
              className="h-2 rounded-full bg-muted"
              style={{ width: `${width}%`, opacity: 1 - index * 0.18 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-border p-2">
        <span className="text-[10px] text-muted-foreground">142 posts read · building profile</span>
      </div>
    </div>
  );
}

export function VoiceScreen() {
  return (
    <div className="flex flex-col">
      <Heading title="How you write" sub="Version 3 · edited by you" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Chip tone="accent">direct</Chip>
        <Chip tone="accent">analytical</Chip>
        <Chip>no emoji</Chip>
        <Chip>short sentences</Chip>
      </div>
      <span className="mb-1.5 font-medium text-[10px]">Rules we follow when writing as you</span>
      <ul className="flex flex-col gap-1">
        {[
          "Open with the claim, never a question",
          "Never say 'game changer' or 'unlock'",
          "British spelling throughout",
        ].map((rule) => (
          <li
            key={rule}
            className="rounded-md border border-border px-2 py-1.5 text-[10px] text-muted-foreground"
          >
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlanScreen() {
  const days = [
    { day: "Monday", topic: "What the migration cost us", time: "09:00" },
    { day: "Wednesday", topic: "Why we stopped using feature flags", time: "18:00" },
    { day: "Friday", topic: "The one metric that changed my mind", time: "09:00" },
    { day: "Saturday", topic: "Reading notes: distributed systems", time: "13:00" },
  ];

  return (
    <div className="flex flex-col">
      <Heading title="Your week" sub="Four pieces, spread across the days you actually post" />
      <div className="grid grid-cols-2 gap-2">
        {days.map((slot) => (
          <div key={slot.day} className="flex flex-col gap-1 rounded-md border border-border p-2">
            <span className="text-[9px] text-muted-foreground">
              {slot.day} · {slot.time}
            </span>
            <span className="font-medium text-[10px] leading-snug">{slot.topic}</span>
            <Chip>Single post</Chip>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApprovalScreen() {
  return (
    <div className="flex flex-col">
      <Heading title="Ready for you" sub="Nothing goes out until you approve it" />
      <div className="rounded-md border border-border p-2.5">
        <p className="text-[10px] leading-relaxed">
          We moved off serverless last month. The cold starts were fine — it was the local dev story
          that killed it. Three engineers, three different reproductions of the same bug.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <FakeButton variant="primary">Approve</FakeButton>
        <FakeButton>Edit</FakeButton>
        <FakeButton>Rewrite</FakeButton>
        <span className="ml-auto text-[9px] text-muted-foreground">Mon 09:00</span>
      </div>
    </div>
  );
}
