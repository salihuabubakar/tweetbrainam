import { logger, schedules } from "@trigger.dev/sdk";
import {
  isLocalHour,
  loadSubscription,
  notifyUser,
  trialDaysRemaining,
  trialEndingNotification,
  trialExpiredNotification,
  trialNoticeDue,
} from "@tweetbrainam/core";
import { createIdentityDeps, createNotifyDeps, createQuotaDeps } from "../deps";

// Sent at 10:00 in the user's own zone rather than a fixed UTC hour, so nobody
// is woken at 3am. Running hourly and filtering on local time means each user is
// considered exactly once a day, which is what keeps a notice from repeating.
const NOTICE_HOUR = 10;

export const trialNoticesSchedule = schedules.task({
  id: "trial-notices",
  cron: "0 * * * *",
  maxDuration: 600,
  run: async (payload) => {
    const notify = createNotifyDeps();
    if (!notify) return { sent: 0, due: 0 };

    const identity = createIdentityDeps();
    const users = await identity.listActiveOnboardedUsers();
    const due = users.filter((user) => isLocalHour(payload.timestamp, user.timezone, NOTICE_HOUR));

    if (due.length === 0) return { sent: 0, due: 0 };

    const quotaDeps = createQuotaDeps();
    let sent = 0;

    for (const user of due) {
      const subscription = await loadSubscription(quotaDeps, user.id);
      const notice = trialNoticeDue(subscription, payload.timestamp);
      if (!notice) continue;

      await notifyUser(notify, {
        userId: user.id,
        notification:
          notice === "expired"
            ? trialExpiredNotification()
            : trialEndingNotification(trialDaysRemaining(subscription, payload.timestamp)),
      });

      sent += 1;
    }

    logger.info("trial notices complete", { sent, due: due.length });
    return { sent, due: due.length };
  },
});
