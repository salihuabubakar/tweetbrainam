import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createStubDeps } from "../test/stub-deps";

describe("auth flow", () => {
  it("redirects /v1/auth/x/start to the X authorization url", async () => {
    const app = createApp(createStubDeps());
    const res = await app.request("/v1/auth/x/start");
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("https://x.com/i/oauth2/authorize");
    expect(location).toContain("state=state-1");
    expect(location).toContain("code_challenge=challenge");
  });

  it("completes the round trip: start, callback, session cookie, /v1/me", async () => {
    const app = createApp(createStubDeps());
    await app.request("/v1/auth/x/start");

    const callback = await app.request("/v1/auth/x/callback?code=abc&state=state-1");
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe("http://localhost:3000/onboarding");
    const cookie = callback.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("tb_session=session-1");
    expect(cookie).toContain("HttpOnly");

    const me = await app.request("/v1/me", { headers: { cookie: "tb_session=session-1" } });
    expect(me.status).toBe(200);
    const body = (await me.json()) as { user: { id: string } };
    expect(body.user.id).toBe("user-1");
  });

  it("redirects to login with an error for a forged state", async () => {
    const app = createApp(createStubDeps());
    const res = await app.request("/v1/auth/x/callback?code=abc&state=forged");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=oauth_state_invalid",
    );
  });

  it("rejects /v1/me without a session", async () => {
    const app = createApp(createStubDeps());
    const res = await app.request("/v1/me");
    expect(res.status).toBe(401);
  });

  it("destroys the session on logout", async () => {
    const app = createApp(createStubDeps());
    await app.request("/v1/auth/x/start");
    await app.request("/v1/auth/x/callback?code=abc&state=state-1");

    const logout = await app.request("/v1/auth/logout", {
      method: "POST",
      headers: { cookie: "tb_session=session-1" },
    });
    expect(logout.status).toBe(200);

    const me = await app.request("/v1/me", { headers: { cookie: "tb_session=session-1" } });
    expect(me.status).toBe(401);
  });
});
