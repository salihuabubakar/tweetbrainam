"use client";

import { apiUrl } from "@/lib/api-url";
import { type SettingsSummaryValue, settingsSummarySchema } from "@tweetbrainam/contracts";
import { useCallback, useEffect, useState } from "react";
import { CadenceForm } from "./cadence-form";
import { ConnectionCard } from "./connection-card";
import { DangerZone } from "./danger-zone";
import { UsageCard } from "./usage-card";

export function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsSummaryValue | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/v1/settings`, { credentials: "include" });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    const parsed = settingsSummarySchema.safeParse(await response.json());
    if (!parsed.success) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setSettings(parsed.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <p role="alert" className="text-destructive text-sm">
        We couldn't load your settings. Refresh the page to try again.
      </p>
    );
  }

  if (!settings) {
    return <p className="text-muted-foreground text-sm">Loading your settings…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ConnectionCard account={settings.account} />
      <CadenceForm
        key={`${settings.cadence.goal}-${settings.cadence.postsPerWeek}`}
        cadence={settings.cadence}
        onSaved={load}
      />
      <UsageCard plan={settings.plan} />
      <DangerZone />
    </div>
  );
}
