"use client";

import { apiUrl } from "@/lib/api-url";
import type { SettingsSummaryValue } from "@tweetbrainam/contracts";
import { buttonVariants } from "@tweetbrainam/ui";

type Account = SettingsSummaryValue["account"];

const statusCopy: Record<NonNullable<Account>["connectionStatus"], string> = {
  connected: "Connected and working.",
  token_expired: "Your connection expired. Reconnect to keep publishing.",
  revoked: "You revoked access on X. Reconnect to keep publishing.",
  rate_limited: "X is throttling us right now. This usually clears on its own.",
};

export function ConnectionCard({ account }: { account: Account }) {
  const needsAttention = account !== null && account.connectionStatus !== "connected";

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">X account</h2>
        <p className="text-muted-foreground text-sm">
          {account
            ? `@${account.handle} · connected ${account.connectedAt.toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}`
            : "No X account is connected."}
        </p>
      </div>

      {needsAttention && account ? (
        <p role="alert" className="text-destructive text-sm">
          {statusCopy[account.connectionStatus]}
        </p>
      ) : null}

      <a
        href={`${apiUrl}/v1/auth/x/start`}
        className={buttonVariants({
          variant: needsAttention ? "primary" : "outline",
          className: "self-start",
        })}
      >
        {account ? "Reconnect X" : "Connect X"}
      </a>

      <p className="text-muted-foreground text-xs">
        Reconnecting refreshes the permission we hold. It keeps your voice profile, plans, and
        drafts exactly as they are.
      </p>
    </section>
  );
}
