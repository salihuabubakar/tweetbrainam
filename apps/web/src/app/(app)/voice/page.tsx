import { VoicePanel } from "@/components/voice/voice-panel";

export const metadata = { title: "Voice" };

export default function VoicePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Voice</h1>
        <p className="text-muted-foreground text-sm">
          What we learned about how you write, and everything you can correct.
        </p>
      </div>
      <VoicePanel />
    </div>
  );
}
