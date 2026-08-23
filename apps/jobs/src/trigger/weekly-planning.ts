import { logger, schedules, tasks } from "@trigger.dev/sdk";
import {
  generateWeeklyPlan,
  isPlanningWindowInZone,
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
    const due = users.filter((user) => isPlanningWindowInZone(payload.timestamp, user.timezone));

    // Logged on every pass, including empty ones: a run that matched nobody used
    // to be indistinguishable from a run where the query returned nothing or the
    // timezones were misread, which made a missed week impossible to diagnose.
    logger.info("weekly planning sweep", {
      candidates: users.length,
      due: due.length,
      timezones: users.map((user) => user.timezone),
    });

    if (due.length === 0) return { planned: 0, skipped: 0, due: 0 };

    let planned = 0;
    let skipped = 0;

    for (const user of due) {
      const weekStart = nextMondayInZone(payload.timestamp, user.timezone);
      const result = await generateWeeklyPlan(createPlanDeps(), { userId: user.id, weekStart });

      if (!result.ok) {
        skipped += 1;
        // Not fatal: the window covers the rest of this user's local Sunday, so
        // the next hourly pass tries again.
        logger.warn("weekly plan skipped", {
          userId: user.id,
          weekStart,
          code: result.error.code,
          message: result.error.message,
        });
        continue;
      }

      // usage is null when an existing plan was returned, which is how a repeat
      // pass in the same window distinguishes itself from real work.
      if (result.value.usage === null) {
        logger.info("weekly plan already existed", { userId: user.id, weekStart });
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
