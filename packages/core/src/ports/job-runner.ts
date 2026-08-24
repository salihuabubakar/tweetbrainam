import type { PostFormat } from "../domain/planning";

export type JobRunner = {
  startAccountAnalysis(userId: string): Promise<void>;
  startVoiceProfileBuild(userId: string): Promise<void>;
  startMemoryExtraction(userId: string): Promise<void>;
  startWeeklyPlanGeneration(userId: string, weekStart?: string): Promise<void>;
  startDraftGeneration(
    userId: string,
    input: {
      planSlotId?: string | undefined;
      brief?: { topic: string; angle: string; format: PostFormat } | undefined;
      guidance?: string | undefined;
    },
  ): Promise<void>;
  schedulePublish(scheduledPostId: string, publishAt: Date): Promise<string | null>;
  cancelPublish(triggerRunId: string): Promise<void>;
};

export type VoiceBuildTrigger = Pick<JobRunner, "startVoiceProfileBuild">;
