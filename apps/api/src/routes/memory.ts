import { zValidator } from "@hono/zod-validator";
import { addMemoryFactInputSchema, updateMemoryFactInputSchema } from "@tweetbrainam/contracts";
import {
  type DomainError,
  addMemoryFact,
  archiveMemoryFact,
  updateMemoryFact,
} from "@tweetbrainam/core";
import { Hono } from "hono";
import type { AppDeps } from "../deps";
import { ApiError } from "../lib/errors";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

const toApiError = (error: DomainError): ApiError => {
  switch (error.code) {
    case "not_found":
      return new ApiError("not_found", error.message, 404);
    case "validation_failed":
      return new ApiError("validation_failed", error.message, 400);
    default:
      return new ApiError("internal", error.message, 500);
  }
};

export function createMemoryRoutes(deps: AppDeps) {
  return new Hono<AppEnv>()
    .get("/v1/memory", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const status = c.req.query("status") === "archived" ? "archived" : "active";
      const facts = await deps.memory.listForUser(userId, status);
      return c.json({ facts });
    })

    .post("/v1/memory", zValidator("json", addMemoryFactInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await addMemoryFact(deps, { userId, ...c.req.valid("json") });
      if (!result.ok) throw toApiError(result.error);
      return c.json({ fact: result.value }, 201);
    })

    .patch("/v1/memory/:id", zValidator("json", updateMemoryFactInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await updateMemoryFact(deps, {
        userId,
        factId: c.req.param("id"),
        ...c.req.valid("json"),
      });
      if (!result.ok) throw toApiError(result.error);
      return c.json({ fact: result.value });
    })

    .delete("/v1/memory/:id", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const result = await archiveMemoryFact(deps, { userId, factId: c.req.param("id") });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    })

    .post("/v1/memory/rebuild", async (c) => {
      const userId = requireUserId(c.get("userId"));
      await deps.jobs.startMemoryExtraction(userId);
      return c.json({ ok: true }, 202);
    });
}
