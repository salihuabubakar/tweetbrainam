import type { JobRunner, ScheduleRepository } from "@tweetbrainam/core";

export type PublishScheduler = {
  arm(input: {
    scheduledPostId: string;
    publishAt: Date;
    currentRunId: string | null;
  }): Promise<void>;
  disarm(input: { scheduledPostId: string; currentRunId: string | null }): Promise<void>;
};

export function createPublishScheduler(deps: {
  jobs: JobRunner;
  schedule: ScheduleRepository;
}): PublishScheduler {
  return {
    async arm({ scheduledPostId, publishAt, currentRunId }) {
      if (currentRunId) await deps.jobs.cancelPublish(currentRunId);
      const runId = await deps.jobs.schedulePublish(scheduledPostId, publishAt);
      await deps.schedule.setTriggerRunId(scheduledPostId, runId);
    },

    async disarm({ scheduledPostId, currentRunId }) {
      if (currentRunId) await deps.jobs.cancelPublish(currentRunId);
      await deps.schedule.setTriggerRunId(scheduledPostId, null);
    },
  };
}
