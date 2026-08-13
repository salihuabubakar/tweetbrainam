import { logger, schemaTask } from "@trigger.dev/sdk";
import { generateDraft } from "@tweetbrainam/core";
import { z } from "zod";
import { createDraftDeps } from "../deps";

export const generateDraftTask = schemaTask({
  id: "generate-draft",
  schema: z.object({
    userId: z.string().uuid(),
    planSlotId: z.string().uuid().optional(),
    brief: z
      .object({
        topic: z.string(),
        angle: z.string(),
        format: z.enum(["single", "thread"]),
      })
      .optional(),
    guidance: z.string().optional(),
  }),
  maxDuration: 300,
  run: async (payload) => {
    const result = await generateDraft(createDraftDeps(), {
      userId: payload.userId,
      ...(payload.planSlotId ? { planSlotId: payload.planSlotId } : {}),
      ...(payload.brief ? { brief: payload.brief } : {}),
      ...(payload.guidance ? { guidance: payload.guidance } : {}),
    });

    if (!result.ok) {
      logger.error("draft failed", {
        planSlotId: payload.planSlotId ?? null,
        code: result.error.code,
      });
      throw new Error(result.error.message);
    }

    logger.info("draft ready", {
      draftId: result.value.draft.id,
      planSlotId: payload.planSlotId ?? null,
      segments: result.value.draft.currentVersion?.segments.length ?? 0,
      provider: result.value.usage.provider,
    });

    return { draftId: result.value.draft.id };
  },
});
