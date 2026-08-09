import { zValidator } from "@hono/zod-validator";
import { deleteAccountInputSchema, updatePreferencesInputSchema } from "@tweetbrainam/contracts";
import {
  type DomainError,
  deleteAccount,
  getSettings,
  updatePreferences,
} from "@tweetbrainam/core";
import { Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import type { AppDeps } from "../deps";
import { ApiError } from "../lib/errors";
import { requireUserId } from "../middleware/session";
import { type AppEnv, SESSION_COOKIE } from "../types";

const toApiError = (error: DomainError): ApiError => {
  switch (error.code) {
    case "user_not_found":
      return new ApiError("not_found", error.message, 404);
    case "validation_failed":
      return new ApiError("validation_failed", error.message, 400);
    default:
      return new ApiError("internal", error.message, 500);
  }
};

export function createSettingsRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .get("/v1/settings", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await getSettings(deps, { userId });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    })

    .patch(
      "/v1/settings/preferences",
      zValidator("json", updatePreferencesInputSchema),
      async (c) => {
        const userId = requireUserId(c.get("userId"));
        const result = await updatePreferences(deps, { userId, ...c.req.valid("json") });
        if (!result.ok) throw toApiError(result.error);
        return c.json(result.value);
      },
    )

    .delete("/v1/settings/account", zValidator("json", deleteAccountInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await deleteAccount(deps, { userId });
      if (!result.ok) throw toApiError(result.error);

      const sessionId = getCookie(c, SESSION_COOKIE);
      if (sessionId) await deps.sessions.destroy(sessionId);
      deleteCookie(c, SESSION_COOKIE, { path: "/" });

      return c.json(result.value);
    });
}
