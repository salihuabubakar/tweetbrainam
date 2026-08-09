import { logger, schemaTask } from "@trigger.dev/sdk";
import { extractMemoryFacts } from "@tweetbrainam/core";
import { z } from "zod";
import { createMemoryDeps } from "../deps";

export const extractMemoryTask = schemaTask({
  id: "extract-memory",
  schema: z.object({ userId: z.string().uuid() }),
  maxDuration: 300,
  run: async (payload) => {
    const result = await extractMemoryFacts(createMemoryDeps(), { userId: payload.userId });

    if (!result.ok) {
      logger.error("memory extraction failed", {
        userId: payload.userId,
        code: result.error.code,
      });
      throw new Error(result.error.message);
    }

    logger.info("memory extracted", {
      userId: payload.userId,
      added: result.value.added.length,
      skippedDuplicates: result.value.skippedDuplicates,
      provider: result.value.usage.provider,
    });

    return { added: result.value.added.length };
  },
});
