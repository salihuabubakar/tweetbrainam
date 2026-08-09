import { type DomainError, domainError } from "../domain/errors";
import {
  MAX_ACTIVE_FACTS,
  type MemoryCategory,
  type MemoryFact,
  isDuplicateFact,
} from "../domain/memory";
import { type Result, err, ok } from "../lib/result";
import type { MemoryRepository } from "../ports/memory-repository";

export type EditMemoryFactsDeps = {
  memory: MemoryRepository;
};

async function requireOwnership(
  deps: EditMemoryFactsDeps,
  input: { userId: string; factId: string },
): Promise<Result<true, DomainError>> {
  const owner = await deps.memory.findOwner(input.factId);
  if (owner === null) return err(domainError("not_found", "That fact no longer exists."));
  if (owner !== input.userId) return err(domainError("not_found", "That fact no longer exists."));
  return ok(true);
}

export async function addMemoryFact(
  deps: EditMemoryFactsDeps,
  input: { userId: string; category: MemoryCategory; content: string },
): Promise<Result<MemoryFact, DomainError>> {
  const active = await deps.memory.listForUser(input.userId, "active");

  if (active.length >= MAX_ACTIVE_FACTS) {
    return err(
      domainError(
        "validation_failed",
        `You can keep ${MAX_ACTIVE_FACTS} facts at a time. Archive one to make room.`,
      ),
    );
  }

  const known = active.map((fact) => fact.content);
  if (isDuplicateFact(input.content, known)) {
    return err(domainError("validation_failed", "You already have that fact."));
  }

  const added = await deps.memory.addFacts(input.userId, [
    { category: input.category, content: input.content, confidence: 1, source: "user_provided" },
  ]);

  const fact = added[0];
  if (!fact) return err(domainError("validation_failed", "We couldn't save that fact."));
  return ok(fact);
}

export async function updateMemoryFact(
  deps: EditMemoryFactsDeps,
  input: {
    userId: string;
    factId: string;
    content?: string | undefined;
    category?: MemoryCategory | undefined;
  },
): Promise<Result<MemoryFact, DomainError>> {
  const owned = await requireOwnership(deps, input);
  if (!owned.ok) return owned;

  const updated = await deps.memory.updateFact(input.factId, {
    ...(input.content ? { content: input.content } : {}),
    ...(input.category ? { category: input.category } : {}),
  });

  if (!updated) return err(domainError("not_found", "That fact no longer exists."));
  return ok(updated);
}

export async function archiveMemoryFact(
  deps: EditMemoryFactsDeps,
  input: { userId: string; factId: string },
): Promise<Result<{ factId: string }, DomainError>> {
  const owned = await requireOwnership(deps, input);
  if (!owned.ok) return owned;

  await deps.memory.setStatus(input.factId, "archived");
  return ok({ factId: input.factId });
}
