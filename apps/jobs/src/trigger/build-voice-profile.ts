import { logger, schemaTask, tasks } from "@trigger.dev/sdk";
import { buildVoiceProfile, embedAccountPosts } from "@tweetbrainam/core";
import { z } from "zod";
import { createEmbeddingDeps, createVoiceDeps } from "../deps";

export const buildVoiceProfileTask = schemaTask({
  id: "build-voice-profile",
  schema: z.object({ userId: z.string().uuid() }),
  maxDuration: 300,
  run: async (payload) => {
    const voiceDeps = createVoiceDeps();
    const result = await buildVoiceProfile(voiceDeps, { userId: payload.userId });

    if (!result.ok) {
      logger.error("voice profile failed", {
        userId: payload.userId,
        code: result.error.code,
      });
      throw new Error(result.error.message);
    }

    const account = await voiceDeps.ingestion.findAccountByUserId(payload.userId);
    if (account) {
      const embedded = await embedAccountPosts(createEmbeddingDeps(), {
        xAccountId: account.id,
      });
      logger.info("post embedding pass complete", {
        userId: payload.userId,
        embedded: embedded.embedded,
        skipped: embedded.skipped,
      });
    }

    await tasks.trigger("extract-memory", { userId: payload.userId });

    logger.info("voice profile built", {
      userId: payload.userId,
      version: result.value.profile.version,
      provider: result.value.usage.provider,
      inputTokens: result.value.usage.inputTokens,
      outputTokens: result.value.usage.outputTokens,
      latencyMs: result.value.usage.latencyMs,
    });

    return { version: result.value.profile.version };
  },
});
