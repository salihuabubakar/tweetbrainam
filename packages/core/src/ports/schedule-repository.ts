import type { DraftSegment } from "../domain/drafting";
import type { PublishFailureReason, PublishStatus, ScheduledPost } from "../domain/publishing";

export type ScheduledPostWithContent = ScheduledPost & {
  xAccountId: string;
  planSlotId: string | null;
  topic: string | null;
  segments: DraftSegment[];
};

export type ScheduleRepository = {
  schedule(input: { draftId: string; xAccountId: string; publishAt: Date }): Promise<ScheduledPost>;
  findById(scheduledPostId: string): Promise<ScheduledPostWithContent | null>;
  findByDraft(draftId: string): Promise<ScheduledPost | null>;
  listForAccount(xAccountId: string, from: Date, to: Date): Promise<ScheduledPostWithContent[]>;
  setStatus(
    scheduledPostId: string,
    status: PublishStatus,
    detail?: { xPostIds?: string[]; failureReason?: PublishFailureReason; publishedAt?: Date },
  ): Promise<void>;
  setPublishAt(scheduledPostId: string, publishAt: Date): Promise<void>;
  setTriggerRunId(scheduledPostId: string, triggerRunId: string | null): Promise<void>;
  claimForPublishing(scheduledPostId: string): Promise<boolean>;
};
