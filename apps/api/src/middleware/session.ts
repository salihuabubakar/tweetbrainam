import type { SessionStore } from "@tweetbrainam/core";
import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { unauthorized } from "../lib/errors";
import { SESSION_COOKIE } from "../types";

export function createSessionMiddleware(sessions: SessionStore): MiddlewareHandler {
  return async (c, next) => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId) {
      const userId = await sessions.getUserId(sessionId);
      if (userId) c.set("userId", userId);
    }
    await next();
  };
}

export const requireUserId = (userId: string | undefined): string => {
  if (!userId) throw unauthorized();
  return userId;
};
