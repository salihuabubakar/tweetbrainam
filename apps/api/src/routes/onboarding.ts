import { zValidator } from "@hono/zod-validator";
import { importPostsInputSchema, saveGoalsInputSchema } from "@tweetbrainam/contracts";
import {
  type DomainError,
  acceptConsent,
  advanceOnboarding,
  getAnalysisStatus,
  importPastedPosts,
  saveGoals,
} from "@tweetbrainam/core";
import { Hono } from "hono";
import type { AppDeps } from "../deps";
import { env } from "../env";
import { ApiError } from "../lib/errors";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

const toApiError = (error: DomainError): ApiError => {
  switch (error.code) {
    case "user_not_found":
      return new ApiError("not_found", error.message, 404);
    case "onboarding_step_invalid":
      return new ApiError("conflict", error.message, 409);
    case "x_connection_revoked":
      return new ApiError("x_connection_revoked", error.message, 409);
    case "ingestion_failed":
      return new ApiError("generation_failed", error.message, 502);
    default:
      return new ApiError("internal", error.message, 500);
  }
};

export function createOnboardingRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .post("/v1/onboarding/consent", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await acceptConsent(deps, { userId });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    })

    .get("/v1/onboarding/analysis-status", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await getAnalysisStatus(deps, { userId });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    })

    .post("/v1/onboarding/import-posts", zValidator("json", importPostsInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await importPastedPosts(deps, {
        userId,
        raw: c.req.valid("json").raw,
        maxPosts: env.INGESTION_MAX_POSTS,
      });
      if (!result.ok) throw toApiError(result.error);
      await deps.jobs.startVoiceProfileBuild(userId);
      return c.json(result.value);
    })

    .post("/v1/onboarding/retry-analysis", async (c) => {
      const userId = requireUserId(c.get("userId"));
      await deps.jobs.startAccountAnalysis(userId);
      return c.json({ ok: true });
    })

    .post("/v1/onboarding/advance", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await advanceOnboarding(deps, { userId });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    })

    .post("/v1/onboarding/goals", zValidator("json", saveGoalsInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await saveGoals(deps, { userId, goals: c.req.valid("json") });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    });
}
