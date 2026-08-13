import { type DomainError, domainError } from "../domain/errors";
import type { IngestionSummary } from "../domain/ingestion";
import { parsePastedPosts } from "../domain/pasted-posts";
import { PLAN_SCAN_LIMITS } from "../domain/usage";
import { type Result, err, ok } from "../lib/result";
import type { IngestionRepository } from "../ports/ingestion-repository";
import { type QuotaDeps, loadSubscription } from "./enforce-quota";

export type ImportPastedPostsDeps = QuotaDeps & {
  ingestion: IngestionRepository;
};

export type ImportPastedPostsInput = {
  userId: string;
  raw: string;
  maxPosts: number;
};

export async function importPastedPosts(
  deps: ImportPastedPostsDeps,
  input: ImportPastedPostsInput,
): Promise<Result<IngestionSummary, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) {
    return err(domainError("x_connection_revoked", "No connected X account found."));
  }

  const subscription = await loadSubscription(deps, input.userId);
  const alreadyStored = await deps.ingestion.countIngestedPosts(account.id);
  const scanBudget = PLAN_SCAN_LIMITS[subscription.planCode] - alreadyStored;

  if (scanBudget <= 0) {
    return err(
      domainError(
        "quota_exceeded",
        `We've already read the ${PLAN_SCAN_LIMITS[subscription.planCode]} posts your plan covers.`,
      ),
    );
  }

  const posts = parsePastedPosts(input.raw, Math.min(input.maxPosts, scanBudget));
  if (posts.length === 0) {
    return err(
      domainError("ingestion_failed", "We couldn't find any usable posts in what you pasted."),
    );
  }

  const stored = await deps.ingestion.saveIngestedPosts(account.id, posts);
  await deps.ingestion.setAnalysisState(account.id, "complete");

  return ok({ fetched: posts.length, stored, newestPostId: null });
}
