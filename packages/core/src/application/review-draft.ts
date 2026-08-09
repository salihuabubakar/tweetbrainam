import {
  type Draft,
  type DraftSegment,
  canTransition,
  segmentsWithinLimit,
} from "../domain/drafting";
import { type DomainError, domainError } from "../domain/errors";
import { type Result, err, ok } from "../lib/result";
import type { Clock } from "../ports/clock";
import type { DraftRepository } from "../ports/draft-repository";
import type { PlanRepository } from "../ports/plan-repository";
import type { ScheduleRepository } from "../ports/schedule-repository";

export type ReviewDraftDeps = {
  drafts: DraftRepository;
  plans: PlanRepository;
  schedule: ScheduleRepository;
  clock: Clock;
};

const IMMEDIATE_PUBLISH_GRACE_MS = 60_000;

async function loadDraft(
  deps: ReviewDraftDeps,
  draftId: string,
): Promise<Result<Draft, DomainError>> {
  const draft = await deps.drafts.findById(draftId);
  if (!draft) return err(domainError("not_found", "That draft no longer exists."));
  return ok(draft);
}

export async function approveDraft(
  deps: ReviewDraftDeps,
  input: { draftId: string; publishAt?: Date | undefined },
): Promise<Result<{ draft: Draft }, DomainError>> {
  const loaded = await loadDraft(deps, input.draftId);
  if (!loaded.ok) return loaded;
  const draft = loaded.value;

  if (!canTransition(draft.status, "approved")) {
    return err(domainError("draft_not_editable", `A ${draft.status} draft cannot be approved.`));
  }
  if (!draft.currentVersion || draft.currentVersion.segments.length === 0) {
    return err(domainError("draft_not_editable", "There is nothing to approve yet."));
  }
  if (!segmentsWithinLimit(draft.currentVersion.segments)) {
    return err(domainError("draft_not_editable", "One of your posts is over 280 characters."));
  }

  await deps.drafts.setStatus(draft.id, "approved");
  if (draft.planSlotId) await deps.plans.updateSlotStatus(draft.planSlotId, "approved");

  const accountId = await deps.drafts.findAccountIdForDraft(draft.id);
  if (accountId) {
    const slot = draft.planSlotId ? await deps.plans.findSlotById(draft.planSlotId) : null;
    const now = deps.clock.now();
    const requested = input.publishAt ?? slot?.targetAt ?? now;
    const publishAt =
      requested.getTime() <= now.getTime()
        ? new Date(now.getTime() + IMMEDIATE_PUBLISH_GRACE_MS)
        : requested;

    const existing = await deps.schedule.findByDraft(draft.id);
    if (existing) {
      await deps.schedule.setPublishAt(existing.id, publishAt);
      if (existing.status !== "scheduled") await deps.schedule.setStatus(existing.id, "scheduled");
    } else {
      await deps.schedule.schedule({ draftId: draft.id, xAccountId: accountId, publishAt });
    }
  }

  return ok({ draft: { ...draft, status: "approved" } });
}

export async function rejectDraft(
  deps: ReviewDraftDeps,
  input: { draftId: string; reason?: string | undefined },
): Promise<Result<{ draft: Draft }, DomainError>> {
  const loaded = await loadDraft(deps, input.draftId);
  if (!loaded.ok) return loaded;
  const draft = loaded.value;

  if (!canTransition(draft.status, "rejected")) {
    return err(domainError("draft_not_editable", `A ${draft.status} draft cannot be rejected.`));
  }

  await deps.drafts.setStatus(draft.id, "rejected");
  if (draft.planSlotId) await deps.plans.updateSlotStatus(draft.planSlotId, "empty");

  const accountId = await deps.drafts.findAccountIdForDraft(draft.id);
  if (accountId) {
    await deps.drafts.recordLearningSignal({
      xAccountId: accountId,
      draftId: draft.id,
      type: "rejection",
      payload: {
        reason: input.reason ?? null,
        rejectedText: draft.currentVersion?.segments ?? [],
      },
    });
  }

  return ok({ draft: { ...draft, status: "rejected" } });
}

export async function editDraft(
  deps: ReviewDraftDeps,
  input: { draftId: string; segments: DraftSegment[] },
): Promise<Result<{ draft: Draft }, DomainError>> {
  const loaded = await loadDraft(deps, input.draftId);
  if (!loaded.ok) return loaded;
  const draft = loaded.value;

  if (draft.status === "archived") {
    return err(domainError("draft_not_editable", "Archived drafts cannot be edited."));
  }
  if (!segmentsWithinLimit(input.segments)) {
    return err(domainError("draft_not_editable", "One of your posts is over 280 characters."));
  }

  const previousSegments = draft.currentVersion?.segments ?? [];
  const updated = await deps.drafts.addVersion(draft.id, input.segments, "user");
  await deps.drafts.setStatus(draft.id, "needs_review");
  if (draft.planSlotId) await deps.plans.updateSlotStatus(draft.planSlotId, "ready");

  if (draft.status === "approved") {
    const scheduled = await deps.schedule.findByDraft(draft.id);
    if (scheduled?.status === "scheduled") {
      await deps.schedule.setStatus(scheduled.id, "canceled");
    }
  }

  const accountId = await deps.drafts.findAccountIdForDraft(draft.id);
  const wasAiWritten = draft.currentVersion?.author === "ai";
  if (accountId && wasAiWritten) {
    await deps.drafts.recordLearningSignal({
      xAccountId: accountId,
      draftId: draft.id,
      type: "edit_diff",
      payload: { aiSegments: previousSegments, userSegments: input.segments },
    });
  }

  return ok({ draft: { ...updated, status: "needs_review" } });
}
