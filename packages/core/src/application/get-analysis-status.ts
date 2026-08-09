import { type DomainError, domainError } from "../domain/errors";
import {
  type AnalysisFailureReason,
  MIN_POSTS_FOR_VOICE_PROFILE,
  analysisFailureMessages,
} from "../domain/ingestion";
import { type Result, err, ok } from "../lib/result";
import type { IngestionRepository } from "../ports/ingestion-repository";

export type AnalysisStatus = {
  state: "pending" | "in_progress" | "ready" | "insufficient_posts" | "failed";
  postsAnalyzed: number;
  postsNeeded: number;
  failureReason: AnalysisFailureReason | null;
  message: string | null;
  canRetry: boolean;
};

export type GetAnalysisStatusDeps = {
  ingestion: IngestionRepository;
};

export async function getAnalysisStatus(
  deps: GetAnalysisStatusDeps,
  input: { userId: string },
): Promise<Result<AnalysisStatus, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) {
    return err(domainError("x_connection_revoked", "No connected X account found."));
  }

  const postsAnalyzed = await deps.ingestion.countIngestedPosts(account.id);
  const base = { postsAnalyzed, postsNeeded: MIN_POSTS_FOR_VOICE_PROFILE };

  if (account.analysisState === "failed") {
    const reason = account.analysisFailureReason ?? "unknown";
    return ok({
      ...base,
      state: "failed",
      failureReason: reason,
      message: analysisFailureMessages[reason],
      canRetry: reason !== "access_denied",
    });
  }

  if (postsAnalyzed >= MIN_POSTS_FOR_VOICE_PROFILE) {
    return ok({ ...base, state: "ready", failureReason: null, message: null, canRetry: false });
  }

  if (account.analysisState === "complete") {
    return ok({
      ...base,
      state: "insufficient_posts",
      failureReason: null,
      message: null,
      canRetry: false,
    });
  }

  return ok({
    ...base,
    state: account.analysisState === "running" ? "in_progress" : "pending",
    failureReason: null,
    message: null,
    canRetry: false,
  });
}
