import { logger, schemaTask } from "@trigger.dev/sdk";
import { ingestAccountPosts } from "@tweetbrainam/core";
import { z } from "zod";
import { createIngestionDeps } from "../deps";
import { env } from "../env";

export const analyzeAccount = schemaTask({
  id: "analyze-account",
  schema: z.object({ userId: z.string().uuid() }),
  maxDuration: 300,
  run: async (payload) => {
    const deps = createIngestionDeps();
    const result = await ingestAccountPosts(deps, {
      userId: payload.userId,
      maxPosts: env.INGESTION_MAX_POSTS,
    });

    if (!result.ok) {
      logger.error("ingestion failed", { userId: payload.userId, code: result.error.code });
      throw new Error(result.error.message);
    }

    logger.info("ingestion complete", {
      userId: payload.userId,
      fetched: result.value.fetched,
      stored: result.value.stored,
    });

    return result.value;
  },
});
