import { Hono } from "hono";
import type { AppDeps } from "../deps";
import { notFound } from "../lib/errors";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

export function createMeRoutes(deps: AppDeps) {
  return new Hono<AppEnv>().get("/v1/me", async (c) => {
    const userId = requireUserId(c.get("userId"));
    const user = await deps.identity.findUserById(userId);
    if (!user) throw notFound("Your account no longer exists.");
    return c.json({ user });
  });
}
