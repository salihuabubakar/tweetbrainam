import { logger, schedules, tasks } from "@trigger.dev/sdk";
import { generateWeeklyPlan, nextMondayOf } from "@tweetbrainam/core";
import { createIdentityDeps, createPlanDeps } from "../deps";

export const weeklyPlanningSchedule = schedules.task({
  id: "weekly-planning",
  cron: "0 17 * * 0",
  maxDuration: 600,
  run: async (payload) => {
    const identity = createIdentityDeps();
    const userIds = await identity.listActiveOnboardedUserIds();
    const weekStart = nextMondayOf(payload.timestamp);

    logger.info("weekly planning starting", { users: userIds.length, weekStart });

    let planned = 0;
    let skipped = 0;

    for (const userId of userIds) {
      const result = await generateWeeklyPlan(createPlanDeps(), { userId, weekStart });

      if (!result.ok) {
        skipped += 1;
        logger.warn("weekly plan skipped", { userId, code: result.error.code });
        continue;
      }

      planned += 1;

      for (const slot of result.value.plan.slots) {
        if (slot.status !== "empty") continue;
        await tasks.trigger("generate-draft", { userId, planSlotId: slot.id });
      }
    }

    logger.info("weekly planning complete", { planned, skipped, weekStart });
    return { planned, skipped, weekStart };
  },
});
