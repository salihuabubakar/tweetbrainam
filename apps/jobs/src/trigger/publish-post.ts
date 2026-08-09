import { logger, schemaTask } from "@trigger.dev/sdk";
import { publishScheduledPost } from "@tweetbrainam/core";
import { z } from "zod";
import { createPublishDeps } from "../deps";

export const publishPostTask = schemaTask({
  id: "publish-post",
  schema: z.object({ scheduledPostId: z.string().uuid() }),
  maxDuration: 120,
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 60000 },
  run: async (payload) => {
    const result = await publishScheduledPost(createPublishDeps(), {
      scheduledPostId: payload.scheduledPostId,
    });

    if (!result.ok) {
      logger.error("publish failed", {
        scheduledPostId: payload.scheduledPostId,
        code: result.error.code,
        retryable: result.error.retryable,
      });
      if (result.error.retryable) throw new Error(result.error.message);
      return { published: false, reason: result.error.code };
    }

    logger.info("published", {
      scheduledPostId: payload.scheduledPostId,
      xPostIds: result.value.xPostIds,
      alreadyPublished: result.value.alreadyPublished,
    });

    return { published: true, xPostIds: result.value.xPostIds };
  },
});
