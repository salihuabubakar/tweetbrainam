import { zValidator } from "@hono/zod-validator";
import { addPlanSlotInputSchema, updatePlanSlotInputSchema } from "@tweetbrainam/contracts";
import {
  type DomainError,
  addPlanSlot,
  mondayOf,
  nextMondayOf,
  removePlanSlot,
  restorePlanSlot,
  skipPlanSlot,
  updatePlanSlot,
} from "@tweetbrainam/core";
import { Hono } from "hono";
import type { AppDeps } from "../deps";
import { ApiError, notFound } from "../lib/errors";
import { requireQuota } from "../lib/require-quota";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

const toApiError = (error: DomainError): ApiError => {
  switch (error.code) {
    case "not_found":
      return new ApiError("not_found", error.message, 404);
    case "validation_failed":
      return new ApiError("validation_failed", error.message, 400);
    case "x_connection_revoked":
      return new ApiError("x_connection_revoked", error.message, 409);
    default:
      return new ApiError("internal", error.message, 500);
  }
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// An explicit weekStart lets the client browse any week. It is snapped to the
// Monday of whatever date arrives, so a malformed or mid-week value reads a real
// week rather than returning nothing. `week=this|next` stays supported for the
// onboarding step, which has no week picker.
function resolveWeekStart(
  weekStart: string | undefined,
  week: string | undefined,
  deps: AppDeps,
): string {
  if (weekStart && ISO_DATE.test(weekStart)) {
    const parsed = new Date(`${weekStart}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return mondayOf(parsed);
  }

  const now = deps.clock.now();
  return week === "next" ? nextMondayOf(now) : mondayOf(now);
}

export function createPlanRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .get("/v1/plans/current", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const account = await deps.ingestion.findAccountByUserId(userId);
      if (!account) throw notFound("No connected X account.");

      const weekStart = resolveWeekStart(c.req.query("weekStart"), c.req.query("week"), deps);
      const plan = await deps.plans.findPlanByWeek(account.id, weekStart);
      return c.json({ plan, weekStart });
    })

    // Without an explicit week this fell back to mondayOf(now), so asking for
    // next week's plan from the next-week tab quietly planned the current one.
    .post("/v1/plans/generate", async (c) => {
      const userId = requireUserId(c.get("userId"));
      await requireQuota(deps, { userId, metric: "plan_generated" });

      const weekStart = resolveWeekStart(c.req.query("weekStart"), c.req.query("week"), deps);
      await deps.jobs.startWeeklyPlanGeneration(userId, weekStart);
      return c.json({ ok: true, weekStart }, 202);
    })

    .post("/v1/plans/:id/slots", zValidator("json", addPlanSlotInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await addPlanSlot(deps, {
        userId,
        planId: c.req.param("id"),
        ...c.req.valid("json"),
      });
      if (!result.ok) throw toApiError(result.error);
      return c.json({ slot: result.value }, 201);
    })

    .patch("/v1/plans/slots/:id", zValidator("json", updatePlanSlotInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await updatePlanSlot(deps, {
        userId,
        slotId: c.req.param("id"),
        ...c.req.valid("json"),
      });
      if (!result.ok) throw toApiError(result.error);
      return c.json({ slot: result.value });
    })

    .post("/v1/plans/slots/:id/skip", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await skipPlanSlot(deps, { userId, slotId: c.req.param("id") });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    })

    .post("/v1/plans/slots/:id/restore", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await restorePlanSlot(deps, { userId, slotId: c.req.param("id") });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    })

    .delete("/v1/plans/slots/:id", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await removePlanSlot(deps, { userId, slotId: c.req.param("id") });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    });
}
