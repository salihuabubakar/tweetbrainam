import { logger, schemaTask } from "@trigger.dev/sdk";
import { draftReadyNotification, generateDraft, notifyUser } from "@tweetbrainam/core";
import { z } from "zod";
import { createDraftDeps, createNotifyDeps } from "../deps";

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
  run: async (payload, { ctx }) => {
    const draftDeps = createDraftDeps();
    const result = await generateDraft(draftDeps, {
      userId: payload.userId,
      ...(payload.planSlotId ? { planSlotId: payload.planSlotId } : {}),
      ...(payload.brief ? { brief: payload.brief } : {}),
      ...(payload.guidance ? { guidance: payload.guidance } : {}),
      isFinalAttempt: false,
    });

    if (!result.ok) {
      logger.error("draft failed", {
        planSlotId: payload.planSlotId ?? null,
        code: result.error.code,
        attempt: ctx.attempt.number,
      });
      throw new Error(result.error.message);
    }

    logger.info("draft ready", {
      draftId: result.value.draft.id,
      planSlotId: payload.planSlotId ?? null,
      segments: result.value.draft.currentVersion?.segments.length ?? 0,
      provider: result.value.usage.provider,
    });

    const notify = createNotifyDeps();
    if (notify) {
      const slot = payload.planSlotId
        ? await draftDeps.plans.findSlotById(payload.planSlotId)
        : null;

      await notifyUser(notify, {
        userId: payload.userId,
        notification: draftReadyNotification(slot?.topic ?? payload.brief?.topic ?? null),
      });
    }

    return { draftId: result.value.draft.id };
  },
  onFailure: async ({ payload }) => {
    const draftDeps = createDraftDeps();
    const account = await draftDeps.ingestion.findAccountByUserId(payload.userId);
    if (!account) return;

    const generating = await draftDeps.drafts.listForAccount(account.id, "generating");
    const draft = generating.find((d) => d.planSlotId === (payload.planSlotId ?? null));
    if (!draft) return;

    await draftDeps.drafts.setStatus(draft.id, "failed");
    if (payload.planSlotId) {
      await draftDeps.plans.updateSlotStatus(payload.planSlotId, "empty");
    }
  },
});
