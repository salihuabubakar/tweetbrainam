export const metadata = { title: "Voice" };

export default function VoicePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Voice</h1>
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">
          Your Voice DNA and memory profile will live here.
        </p>
      </div>
    </div>
  );
}
