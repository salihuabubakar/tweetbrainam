import { runs, tasks } from "@trigger.dev/sdk";
import type { JobRunner } from "@tweetbrainam/core";
import { logger } from "./logger";

export function createTriggerJobRunner(isEnabled: boolean): JobRunner {
  return {
    async startAccountAnalysis(userId) {
      if (!isEnabled) {
        logger.warn({ userId }, "analysis skipped: TRIGGER_SECRET_KEY not configured");
        return;
      }
      await tasks.trigger("analyze-account", { userId });
    },

    async startVoiceProfileBuild(userId) {
      if (!isEnabled) {
        logger.warn({ userId }, "voice profile skipped: TRIGGER_SECRET_KEY not configured");
        return;
      }
      await tasks.trigger("build-voice-profile", { userId });
    },

    async startMemoryExtraction(userId) {
      if (!isEnabled) {
        logger.warn({ userId }, "memory extraction skipped: TRIGGER_SECRET_KEY not configured");
        return;
      }
      await tasks.trigger("extract-memory", { userId });
    },

    async startWeeklyPlanGeneration(userId, weekStart) {
      if (!isEnabled) {
        logger.warn({ userId }, "weekly plan skipped: TRIGGER_SECRET_KEY not configured");
        return;
      }
      await tasks.trigger("generate-weekly-plan", {
        userId,
        ...(weekStart ? { weekStart } : {}),
      });
    },

    async startDraftGeneration(userId, input) {
      if (!isEnabled) {
        logger.warn({ userId, ...input }, "draft skipped: TRIGGER_SECRET_KEY not configured");
        return;
      }
      await tasks.trigger("generate-draft", {
        userId,
        ...(input.planSlotId ? { planSlotId: input.planSlotId } : {}),
        ...(input.brief ? { brief: input.brief } : {}),
        ...(input.guidance ? { guidance: input.guidance } : {}),
      });
    },

    async schedulePublish(scheduledPostId, publishAt) {
      if (!isEnabled) {
        logger.warn({ scheduledPostId }, "publish skipped: TRIGGER_SECRET_KEY not configured");
        return null;
      }
      const handle = await tasks.trigger("publish-post", { scheduledPostId }, { delay: publishAt });
      return handle.id;
    },

    async cancelPublish(triggerRunId) {
      if (!isEnabled) return;
      await runs.cancel(triggerRunId);
    },
  };
}
