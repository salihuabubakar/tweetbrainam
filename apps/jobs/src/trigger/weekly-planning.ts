import { logger, schedules, tasks } from "@trigger.dev/sdk";
import {
  generateWeeklyPlan,
  isPlanningHourInZone,
  nextMondayInZone,
  notifyUser,
  weekPlannedNotification,
} from "@tweetbrainam/core";
import { createIdentityDeps, createNotifyDeps, createPlanDeps } from "../deps";

export const weeklyPlanningSchedule = schedules.task({
  id: "weekly-planning",
  cron: "0 * * * *",
  maxDuration: 600,
  run: async (payload) => {
    const identity = createIdentityDeps();
    const users = await identity.listActiveOnboardedUsers();
    const due = users.filter((user) => isPlanningHourInZone(payload.timestamp, user.timezone));

    if (due.length === 0) return { planned: 0, skipped: 0, due: 0 };

    logger.info("weekly planning starting", { due: due.length, of: users.length });

    let planned = 0;
    let skipped = 0;

    for (const user of due) {
      const weekStart = nextMondayInZone(payload.timestamp, user.timezone);
      const result = await generateWeeklyPlan(createPlanDeps(), { userId: user.id, weekStart });

      if (!result.ok) {
        skipped += 1;
        logger.warn("weekly plan skipped", { userId: user.id, code: result.error.code });
        continue;
      }

      planned += 1;

      for (const slot of result.value.plan.slots) {
        if (slot.status !== "empty") continue;
        await tasks.trigger("generate-draft", { userId: user.id, planSlotId: slot.id });
      }

      const notify = createNotifyDeps();
      if (notify) {
        await notifyUser(notify, {
          userId: user.id,
          notification: weekPlannedNotification(result.value.plan.slots.length),
        });
      }
    }

    logger.info("weekly planning complete", { planned, skipped, due: due.length });
    return { planned, skipped, due: due.length };
  },
});
