import { zValidator } from "@hono/zod-validator";
import {
  createDraftInputSchema,
  editDraftInputSchema,
  regenerateDraftInputSchema,
  rejectDraftInputSchema,
} from "@tweetbrainam/contracts";
import { type DomainError, approveDraft, editDraft, rejectDraft } from "@tweetbrainam/core";
import { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../deps";
import { ApiError, notFound } from "../lib/errors";
import { createPublishScheduler } from "../lib/publish-scheduler";
import { requireQuota } from "../lib/require-quota";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

const toApiError = (error: DomainError): ApiError => {
  switch (error.code) {
    case "not_found":
      return new ApiError("not_found", error.message, 404);
    case "draft_not_editable":
      return new ApiError("draft_not_editable", error.message, 409);
    case "voice_profile_missing":
      return new ApiError("conflict", error.message, 409);
    case "quota_exceeded":
      return new ApiError("quota_exceeded", error.message, 429);
    case "trial_expired":
      return new ApiError("trial_expired", error.message, 402);
    default:
      return new ApiError("internal", error.message, 500);
  }
};

export function createDraftRoutes(deps: AppDeps) {
  const publishing = createPublishScheduler(deps);

  return new Hono<AppEnv>()
    .get("/v1/drafts", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const account = await deps.ingestion.findAccountByUserId(userId);
      if (!account) throw notFound("No connected X account.");

      const status = c.req.query("status") ?? "needs_review";
      const parsed = z
        .enum(["generating", "needs_review", "approved", "rejected", "archived", "failed"])
        .safeParse(status);
      if (!parsed.success) throw new ApiError("validation_failed", "Unknown draft status.", 400);

      const drafts = await deps.drafts.listForAccount(account.id, parsed.data);
      return c.json({ drafts });
    })

    .get("/v1/drafts/:id", async (c) => {
      requireUserId(c.get("userId"));
      const draft = await deps.drafts.findById(c.req.param("id"));
      if (!draft) throw notFound("That draft no longer exists.");
      return c.json({ draft });
    })

    .post(
      "/v1/plans/slots/:id/draft",
      zValidator("json", regenerateDraftInputSchema),
      async (c) => {
        const userId = requireUserId(c.get("userId"));
        await requireQuota(deps, { userId, metric: "draft_generated" });

        const { guidance } = c.req.valid("json");
        await deps.jobs.startDraftGeneration(userId, {
          planSlotId: c.req.param("id"),
          guidance,
        });
        return c.json({ ok: true }, 202);
      },
    )

    .post("/v1/drafts", zValidator("json", createDraftInputSchema), async (c) => {
      const userId = requireUserId(c.get("userId"));
      await requireQuota(deps, { userId, metric: "draft_generated" });

      const { topic, angle, format, guidance } = c.req.valid("json");
      await deps.jobs.startDraftGeneration(userId, {
        brief: { topic, angle, format },
        guidance,
      });
      return c.json({ ok: true }, 202);
    })

    .put("/v1/drafts/:id/content", zValidator("json", editDraftInputSchema), async (c) => {
      requireUserId(c.get("userId"));
      const draftId = c.req.param("id");
      const result = await editDraft(deps, {
        draftId,
        segments: c.req.valid("json").segments,
      });
      if (!result.ok) throw toApiError(result.error);

      const scheduled = await deps.schedule.findByDraft(draftId);
      if (scheduled?.status === "canceled") {
        await publishing.disarm({
          scheduledPostId: scheduled.id,
          currentRunId: scheduled.triggerRunId,
        });
      }

      return c.json(result.value);
    })

    .post("/v1/drafts/:id/approve", async (c) => {
      requireUserId(c.get("userId"));
      const draftId = c.req.param("id");

      const previous = await deps.schedule.findByDraft(draftId);
      const result = await approveDraft(deps, { draftId });
      if (!result.ok) throw toApiError(result.error);

      const scheduled = await deps.schedule.findByDraft(draftId);
      if (scheduled) {
        await publishing.arm({
          scheduledPostId: scheduled.id,
          publishAt: scheduled.publishAt,
          currentRunId: previous?.triggerRunId ?? null,
        });
      }

      return c.json({ ...result.value, scheduledPost: scheduled });
    })

    .post("/v1/drafts/:id/reject", zValidator("json", rejectDraftInputSchema), async (c) => {
      requireUserId(c.get("userId"));
      const result = await rejectDraft(deps, {
        draftId: c.req.param("id"),
        reason: c.req.valid("json").reason,
      });
      if (!result.ok) throw toApiError(result.error);
      return c.json(result.value);
    });
}
