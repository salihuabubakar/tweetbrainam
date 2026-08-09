import { settingsSummarySchema } from "@tweetbrainam/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createStubDeps } from "../test/stub-deps";

const session = { cookie: "tb_session=session-1" };

async function signedInApp(overrides: Parameters<typeof createStubDeps>[0] = {}) {
  const app = createApp(createStubDeps(overrides));
  await app.request("/v1/auth/x/start");
  await app.request("/v1/auth/x/callback?code=c&state=state-1");
  return app;
}

describe("settings routes", () => {
  it("requires a session", async () => {
    const app = createApp(createStubDeps());
    const res = await app.request("/v1/settings");
    expect(res.status).toBe(401);
  });

  it("returns a summary that matches the contract", async () => {
    const app = await signedInApp();

    const res = await app.request("/v1/settings", { headers: session });

    expect(res.status).toBe(200);
    expect(settingsSummarySchema.safeParse(await res.json()).success).toBe(true);
  });

  it("saves a new cadence", async () => {
    const saved: unknown[] = [];
    const deps = createStubDeps();
    const app = await signedInApp({
      identity: {
        ...deps.identity,
        savePreferences: async (_id, input) => {
          saved.push(input);
        },
      },
    });

    const res = await app.request("/v1/settings/preferences", {
      method: "PATCH",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ goal: "leads", postsPerWeek: 7, timezone: "Africa/Lagos" }),
    });

    expect(res.status).toBe(200);
    expect(saved).toHaveLength(1);
  });

  it("rejects a cadence the contract does not allow", async () => {
    const app = await signedInApp();

    const res = await app.request("/v1/settings/preferences", {
      method: "PATCH",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ goal: "leads", postsPerWeek: 99, timezone: "Africa/Lagos" }),
    });

    expect(res.status).toBe(400);
  });

  it("refuses to delete without the typed confirmation", async () => {
    const deleted: string[] = [];
    const deps = createStubDeps();
    const app = await signedInApp({
      identity: {
        ...deps.identity,
        deleteUser: async (id) => {
          deleted.push(id);
        },
      },
    });

    const res = await app.request("/v1/settings/account", {
      method: "DELETE",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "delete" }),
    });

    expect(res.status).toBe(400);
    expect(deleted).toHaveLength(0);
  });

  it("deletes the account and clears the session cookie", async () => {
    const deleted: string[] = [];
    const deps = createStubDeps();
    const app = await signedInApp({
      identity: {
        ...deps.identity,
        deleteUser: async (id) => {
          deleted.push(id);
        },
      },
    });

    const res = await app.request("/v1/settings/account", {
      method: "DELETE",
      headers: { ...session, "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });

    expect(res.status).toBe(200);
    expect(deleted).toEqual(["user-1"]);
    expect(res.headers.get("set-cookie")).toContain("tb_session=;");
  });
});
