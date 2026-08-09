import { SettingsPanel } from "@/components/settings/settings-panel";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Your X connection, how often we plan for you, and what you've used this month.
        </p>
      </div>
      <SettingsPanel />
    </div>
  );
}
