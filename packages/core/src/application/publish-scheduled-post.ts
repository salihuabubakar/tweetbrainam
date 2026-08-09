import { segmentsWithinLimit } from "../domain/drafting";
import { type DomainError, domainError } from "../domain/errors";
import { type PublishFailureReason, isRetryable } from "../domain/publishing";
import { type Result, err, ok } from "../lib/result";
import type { DraftRepository } from "../ports/draft-repository";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { PlanRepository } from "../ports/plan-repository";
import type { ScheduleRepository } from "../ports/schedule-repository";
import type { TokenCipher } from "../ports/security";
import type { XPublishClient } from "../ports/x-publish-client";

export type PublishScheduledPostDeps = {
  schedule: ScheduleRepository;
  drafts: DraftRepository;
  plans: PlanRepository;
  ingestion: IngestionRepository;
  publisher: XPublishClient;
  cipher: TokenCipher;
};

export type PublishScheduledPostOutput = {
  xPostIds: string[];
  alreadyPublished: boolean;
};

export async function publishScheduledPost(
  deps: PublishScheduledPostDeps,
  input: { scheduledPostId: string },
): Promise<Result<PublishScheduledPostOutput, DomainError & { retryable: boolean }>> {
  const withRetry = (error: DomainError, retryable: boolean) => err({ ...error, retryable });

  const post = await deps.schedule.findById(input.scheduledPostId);
  if (!post) {
    return withRetry(domainError("not_found", "That scheduled post no longer exists."), false);
  }

  if (post.status === "published") {
    return ok({ xPostIds: post.xPostIds, alreadyPublished: true });
  }
  if (post.status === "canceled") {
    return withRetry(domainError("publish_canceled", "This post was canceled."), false);
  }

  const draft = await deps.drafts.findById(post.draftId);
  if (!draft || draft.status !== "approved" || !draft.currentVersion) {
    return withRetry(
      domainError("draft_not_approved", "Only an approved draft can be published."),
      false,
    );
  }

  const segments = draft.currentVersion.segments;
  if (segments.length === 0 || !segmentsWithinLimit(segments)) {
    await deps.schedule.setStatus(post.id, "failed", { failureReason: "content_rejected" });
    return withRetry(domainError("publish_failed", "This post is not valid for X."), false);
  }

  const claimed = await deps.schedule.claimForPublishing(post.id);
  if (!claimed) {
    return ok({ xPostIds: post.xPostIds, alreadyPublished: true });
  }

  const encryptedToken = await deps.ingestion.findAccessTokenForAccount(post.xAccountId);
  const accessToken = encryptedToken ? deps.cipher.decrypt(encryptedToken) : null;

  if (!accessToken) {
    await deps.schedule.setStatus(post.id, "failed", { failureReason: "connection_revoked" });
    return withRetry(domainError("x_connection_revoked", "No usable X connection."), false);
  }

  const result = await deps.publisher.publishThread({ accessToken, segments });

  if (!result.ok) {
    const reason: PublishFailureReason = result.error.reason;
    await deps.schedule.setStatus(post.id, "failed", { failureReason: reason });
    return withRetry(domainError("publish_failed", result.error.detail), isRetryable(reason));
  }

  await deps.schedule.setStatus(post.id, "published", {
    xPostIds: result.value.xPostIds,
    publishedAt: new Date(),
  });
  if (post.planSlotId) await deps.plans.updateSlotStatus(post.planSlotId, "published");

  return ok({ xPostIds: result.value.xPostIds, alreadyPublished: false });
}
