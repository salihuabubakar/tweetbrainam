import { zValidator } from "@hono/zod-validator";
import { completeXSignIn, startXSignIn } from "@tweetbrainam/core";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import type { AppDeps } from "../deps";
import { env } from "../env";
import { type AppEnv, SESSION_COOKIE } from "../types";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export function createAuthRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .get("/v1/auth/x/start", async (c) => {
      const { authorizationUrl } = await startXSignIn(deps);
      return c.redirect(authorizationUrl, 302);
    })

    .get("/v1/auth/x/callback", zValidator("query", callbackQuerySchema), async (c) => {
      const { code, state } = c.req.valid("query");
      const result = await completeXSignIn(deps, { code, state });

      if (!result.ok) {
        return c.redirect(`${env.APP_URL}/login?error=${result.error.code}`, 302);
      }

      setCookie(c, SESSION_COOKIE, result.value.sessionId, {
        httpOnly: true,
        sameSite: "Lax",
        secure: env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      const target = result.value.onboardingStep === "done" ? "/today" : "/onboarding";
      return c.redirect(`${env.APP_URL}${target}`, 302);
    })

    .post("/v1/auth/logout", async (c) => {
      const sessionId = getCookie(c, SESSION_COOKIE);
      if (sessionId) await deps.sessions.destroy(sessionId);
      deleteCookie(c, SESSION_COOKIE, { path: "/" });
      return c.json({ ok: true });
    });
}
