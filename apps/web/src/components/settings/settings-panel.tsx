"use client";

import { readApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-url";
import { type SettingsSummaryValue, settingsSummarySchema } from "@tweetbrainam/contracts";
import { useCallback, useEffect, useState } from "react";
import { AppearanceCard } from "./appearance-card";
import { CadenceForm } from "./cadence-form";
import { ConnectionCard } from "./connection-card";
import { DangerZone } from "./danger-zone";
import { NotificationsCard } from "./notifications-card";
import { PlanCard } from "./plan-card";
import { SupportCard } from "./support-card";

export function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsSummaryValue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/v1/settings`, { credentials: "include" });

    if (!response.ok) {
      setFailure(
        await readApiError(response, `The server returned ${response.status} loading settings.`),
      );
      return;
    }

    const parsed = settingsSummarySchema.safeParse(await response.json());
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
      setFailure(`Settings came back in an unexpected shape (${fields}).`);
      return;
    }

    setFailure(null);
    setSettings(parsed.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failure) {
    return (
      <div className="flex flex-col gap-6">
        <p role="alert" className="text-destructive text-sm">
          {failure} Refresh to try again.
        </p>
        <AppearanceCard />
        <SupportCard />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-muted-foreground text-sm">Loading your settings…</p>
        <AppearanceCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AppearanceCard />
      <ConnectionCard account={settings.account} />
      <CadenceForm
        key={`${settings.cadence.goal}-${settings.cadence.postsPerWeek}`}
        cadence={settings.cadence}
        onSaved={load}
      />
      <NotificationsCard />
      <div data-tour="trial">
        <PlanCard plan={settings.plan} />
      </div>
      <SupportCard />
      <DangerZone />
    </div>
  );
}
