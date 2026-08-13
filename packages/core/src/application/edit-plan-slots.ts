import { type DomainError, domainError } from "../domain/errors";
import {
  MAX_SLOTS_PER_PLAN,
  type PlanSlot,
  type PostFormat,
  canEditSlot,
  canRemoveSlot,
  canSkipSlot,
} from "../domain/planning";
import { type Result, err, ok } from "../lib/result";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { PlanRepository } from "../ports/plan-repository";

export type EditPlanSlotsDeps = {
  ingestion: IngestionRepository;
  plans: PlanRepository;
};

const gone = () => domainError("not_found", "That planned post no longer exists.");

async function requireSlot(
  deps: EditPlanSlotsDeps,
  input: { userId: string; slotId: string },
): Promise<Result<PlanSlot, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) return err(domainError("x_connection_revoked", "No connected X account."));

  const owner = await deps.plans.findAccountIdForSlot(input.slotId);
  if (owner !== account.id) return err(gone());

  const slot = await deps.plans.findSlotById(input.slotId);
  if (!slot) return err(gone());
  return ok(slot);
}

export async function updatePlanSlot(
  deps: EditPlanSlotsDeps,
  input: {
    userId: string;
    slotId: string;
    topic?: string | undefined;
    angle?: string | undefined;
    format?: PostFormat | undefined;
    targetAt?: Date | undefined;
  },
): Promise<Result<PlanSlot, DomainError>> {
  const found = await requireSlot(deps, input);
  if (!found.ok) return found;

  if (!canEditSlot(found.value.status)) {
    return err(
      domainError(
        "validation_failed",
        `A ${found.value.status} post can't be changed here. Cancel it from Today first.`,
      ),
    );
  }

  const updated = await deps.plans.updateSlot(input.slotId, {
    topic: input.topic,
    angle: input.angle,
    format: input.format,
    targetAt: input.targetAt,
  });

  if (!updated) return err(gone());
  return ok(updated);
}

export async function skipPlanSlot(
  deps: EditPlanSlotsDeps,
  input: { userId: string; slotId: string },
): Promise<Result<{ slotId: string }, DomainError>> {
  const found = await requireSlot(deps, input);
  if (!found.ok) return found;

  if (!canSkipSlot(found.value.status)) {
    return err(domainError("validation_failed", `A ${found.value.status} post can't be skipped.`));
  }

  await deps.plans.updateSlotStatus(input.slotId, "skipped");
  return ok({ slotId: input.slotId });
}

export async function restorePlanSlot(
  deps: EditPlanSlotsDeps,
  input: { userId: string; slotId: string },
): Promise<Result<{ slotId: string }, DomainError>> {
  const found = await requireSlot(deps, input);
  if (!found.ok) return found;

  if (found.value.status !== "skipped") {
    return err(domainError("validation_failed", "That post isn't skipped."));
  }

  await deps.plans.updateSlotStatus(input.slotId, "empty");
  return ok({ slotId: input.slotId });
}

export async function removePlanSlot(
  deps: EditPlanSlotsDeps,
  input: { userId: string; slotId: string },
): Promise<Result<{ slotId: string }, DomainError>> {
  const found = await requireSlot(deps, input);
  if (!found.ok) return found;

  if (!canRemoveSlot(found.value.status)) {
    return err(
      domainError(
        "validation_failed",
        `A ${found.value.status} post can't be removed. Cancel it from Today first.`,
      ),
    );
  }

  await deps.plans.deleteSlot(input.slotId);
  return ok({ slotId: input.slotId });
}

export async function addPlanSlot(
  deps: EditPlanSlotsDeps,
  input: {
    userId: string;
    planId: string;
    topic: string;
    angle: string;
    format: PostFormat;
    targetAt: Date;
  },
): Promise<Result<PlanSlot, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) return err(domainError("x_connection_revoked", "No connected X account."));

  const owner = await deps.plans.findAccountIdForPlan(input.planId);
  if (owner !== account.id) {
    return err(domainError("not_found", "That plan no longer exists."));
  }

  const existing = await deps.plans.countSlots(input.planId);
  if (existing >= MAX_SLOTS_PER_PLAN) {
    return err(
      domainError("validation_failed", `A week can hold at most ${MAX_SLOTS_PER_PLAN} posts.`),
    );
  }

  const slot = await deps.plans.addSlot(input.planId, {
    topic: input.topic,
    angle: input.angle,
    format: input.format,
    targetAt: input.targetAt,
    position: existing,
  });

  return ok(slot);
}
