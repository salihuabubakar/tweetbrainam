export const publishStatuses = [
  "scheduled",
  "publishing",
  "published",
  "failed",
  "canceled",
] as const;

export type PublishStatus = (typeof publishStatuses)[number];

export const publishFailureReasons = [
  "connection_revoked",
  "rate_limited",
  "duplicate_content",
  "content_rejected",
  "unknown",
] as const;

export type PublishFailureReason = (typeof publishFailureReasons)[number];

export const publishFailureMessages: Record<PublishFailureReason, string> = {
  connection_revoked: "Your X connection expired. Reconnect your account and try again.",
  rate_limited: "X asked us to slow down. We'll retry shortly.",
  duplicate_content: "X rejected this as a duplicate of something you already posted.",
  content_rejected: "X refused to publish this post.",
  unknown: "Something went wrong while publishing. You can try again.",
};

export type ScheduledPost = {
  id: string;
  draftId: string;
  publishAt: Date;
  status: PublishStatus;
  xPostIds: string[];
  failureReason: PublishFailureReason | null;
  triggerRunId: string | null;
};

const allowedTransitions: Record<PublishStatus, readonly PublishStatus[]> = {
  scheduled: ["publishing", "canceled"],
  publishing: ["published", "failed"],
  published: [],
  failed: ["scheduled", "canceled"],
  canceled: ["scheduled"],
};

export function canTransitionPublish(from: PublishStatus, to: PublishStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export const RETRYABLE_FAILURES: readonly PublishFailureReason[] = ["rate_limited", "unknown"];

export function isRetryable(reason: PublishFailureReason): boolean {
  return RETRYABLE_FAILURES.includes(reason);
}

export function isDueForPublishing(post: ScheduledPost, now: Date): boolean {
  return post.status === "scheduled" && post.publishAt.getTime() <= now.getTime();
}
