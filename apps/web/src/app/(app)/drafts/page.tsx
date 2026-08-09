import { DraftsList } from "@/components/drafts/drafts-list";

export const metadata = { title: "Drafts" };

export default function DraftsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Drafts</h1>
        <p className="text-muted-foreground text-sm">
          Written in your voice. Nothing goes out until you approve it.
        </p>
      </div>
      <DraftsList />
    </div>
  );
}
