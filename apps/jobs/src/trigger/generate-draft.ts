import { logger, schemaTask } from "@trigger.dev/sdk";
import { generateDraft } from "@tweetbrainam/core";
import { z } from "zod";
import { createDraftDeps } from "../deps";

export const generateDraftTask = schemaTask({
  id: "generate-draft",
  schema: z.object({
    userId: z.string().uuid(),
    planSlotId: z.string().uuid(),
    guidance: z.string().optional(),
  }),
  maxDuration: 300,
  run: async (payload) => {
    const result = await generateDraft(createDraftDeps(), {
      userId: payload.userId,
      planSlotId: payload.planSlotId,
      ...(payload.guidance ? { guidance: payload.guidance } : {}),
    });

    if (!result.ok) {
      logger.error("draft failed", { planSlotId: payload.planSlotId, code: result.error.code });
      throw new Error(result.error.message);
    }

    logger.info("draft ready", {
      draftId: result.value.draft.id,
      segments: result.value.draft.currentVersion?.segments.length ?? 0,
      provider: result.value.usage.provider,
    });

    return { draftId: result.value.draft.id };
  },
});
