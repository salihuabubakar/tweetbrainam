import { zValidator } from "@hono/zod-validator";
import { editVoiceProfileInputSchema } from "@tweetbrainam/contracts";
import { type DomainError, editVoiceProfile } from "@tweetbrainam/core";
import { Hono } from "hono";
import type { AppDeps } from "../deps";
import { ApiError, notFound } from "../lib/errors";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

const toApiError = (error: DomainError): ApiError => {
  switch (error.code) {
    case "x_connection_revoked":
      return new ApiError("x_connection_revoked", error.message, 409);
    case "voice_profile_missing":
      return new ApiError("conflict", error.message, 409);
    default:
      return new ApiError("internal", error.message, 500);
  }
};

export function createVoiceRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .get("/v1/voice", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const account = await deps.ingestion.findAccountByUserId(userId);
      if (!account) throw notFound("No connected X account.");

      const profile = await deps.voice.findActiveProfile(account.id);
      return c.json({ profile });
    })

    .put("/v1/voice", zValidator("json", editVoiceProfileInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await editVoiceProfile(deps, { userId, ...c.req.valid("json") });
      if (!result.ok) throw toApiError(result.error);
      return c.json({ profile: result.value });
    })

    .post("/v1/voice/rebuild", async (c) => {
      const userId = requireUserId(c.get("userId"));
      await deps.jobs.startVoiceProfileBuild(userId);
      return c.json({ ok: true }, 202);
    });
}
