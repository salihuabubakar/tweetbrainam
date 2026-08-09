import { zValidator } from "@hono/zod-validator";
import { canTransitionPublish } from "@tweetbrainam/core";
import { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../deps";
import { ApiError, notFound } from "../lib/errors";
import { createPublishScheduler } from "../lib/publish-scheduler";
import { requireUserId } from "../middleware/session";
import type { AppEnv } from "../types";

const DEFAULT_WINDOW_DAYS = 14;

const rescheduleSchema = z.object({ publishAt: z.string().datetime() });

export function createScheduleRoutes(deps: AppDeps) {
  const publishing = createPublishScheduler(deps);

  async function requireAccount(userId: string) {
    const account = await deps.ingestion.findAccountByUserId(userId);
    if (!account) throw notFound("No connected X account.");
    return account;
  }

  return new Hono<AppEnv>()
    .get("/v1/schedule", async (c) => {
      const userId = requireUserId(c.get("userId"));
      const account = await requireAccount(userId);

      const now = deps.clock.now();
      const from = new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const to = new Date(now.getTime() + DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      const posts = await deps.schedule.listForAccount(account.id, from, to);
      return c.json({ posts });
    })

    .patch("/v1/schedule/:id", zValidator("json", rescheduleSchema), async (c) => {
      requireUserId(c.get("userId"));
      const post = await deps.schedule.findById(c.req.param("id"));
      if (!post) throw notFound("That scheduled post no longer exists.");
      if (post.status !== "scheduled") {
        throw new ApiError("conflict", `A ${post.status} post cannot be rescheduled.`, 409);
      }

      const publishAt = new Date(c.req.valid("json").publishAt);
      await deps.schedule.setPublishAt(post.id, publishAt);
      await publishing.arm({
        scheduledPostId: post.id,
        publishAt,
        currentRunId: post.triggerRunId,
      });

      return c.json({ ok: true });
    })

    .post("/v1/schedule/:id/cancel", async (c) => {
      requireUserId(c.get("userId"));
      const post = await deps.schedule.findById(c.req.param("id"));
      if (!post) throw notFound("That scheduled post no longer exists.");
      if (!canTransitionPublish(post.status, "canceled")) {
        throw new ApiError("conflict", `A ${post.status} post cannot be canceled.`, 409);
      }

      await deps.schedule.setStatus(post.id, "canceled");
      await publishing.disarm({ scheduledPostId: post.id, currentRunId: post.triggerRunId });

      return c.json({ ok: true });
    })

    .post("/v1/schedule/:id/publish-now", async (c) => {
      requireUserId(c.get("userId"));
      const post = await deps.schedule.findById(c.req.param("id"));
      if (!post) throw notFound("That scheduled post no longer exists.");
      if (post.status === "published") {
        throw new ApiError("conflict", "That post is already published.", 409);
      }

      if (post.status !== "scheduled") await deps.schedule.setStatus(post.id, "scheduled");
      await publishing.arm({
        scheduledPostId: post.id,
        publishAt: deps.clock.now(),
        currentRunId: post.triggerRunId,
      });

      return c.json({ ok: true }, 202);
    })

    .post("/v1/schedule/:id/retry", async (c) => {
      requireUserId(c.get("userId"));
      const post = await deps.schedule.findById(c.req.param("id"));
      if (!post) throw notFound("That scheduled post no longer exists.");
      if (post.status !== "failed") {
        throw new ApiError("conflict", "Only a failed post can be retried.", 409);
      }

      await deps.schedule.setStatus(post.id, "scheduled");
      await publishing.arm({
        scheduledPostId: post.id,
        publishAt: deps.clock.now(),
        currentRunId: post.triggerRunId,
      });

      return c.json({ ok: true }, 202);
    });
}
