import { mondayOf, nextMondayOf } from "@tweetbrainam/core";
import { Hono } from "hono";
import type { AppDeps } from "../deps";
import { notFound } from "../lib/errors";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

export function createPlanRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .get("/v1/plans/current", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const account = await deps.ingestion.findAccountByUserId(userId);
      if (!account) throw notFound("No connected X account.");

      const week = c.req.query("week") === "next" ? "next" : "this";
      const now = deps.clock.now();
      const weekStart = week === "next" ? nextMondayOf(now) : mondayOf(now);

      const plan = await deps.plans.findPlanByWeek(account.id, weekStart);
      return c.json({ plan, week, weekStart });
    })

    .post("/v1/plans/generate", async (c) => {
      const userId = requireUserId(c.get("userId"));
      await deps.jobs.startWeeklyPlanGeneration(userId);
      return c.json({ ok: true }, 202);
    });
}
