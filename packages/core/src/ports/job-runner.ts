export type JobRunner = {
  startAccountAnalysis(userId: string): Promise<void>;
  startVoiceProfileBuild(userId: string): Promise<void>;
  startMemoryExtraction(userId: string): Promise<void>;
  startWeeklyPlanGeneration(userId: string): Promise<void>;
  startDraftGeneration(userId: string, planSlotId: string, guidance?: string): Promise<void>;
  schedulePublish(scheduledPostId: string, publishAt: Date): Promise<string | null>;
  cancelPublish(triggerRunId: string): Promise<void>;
};
