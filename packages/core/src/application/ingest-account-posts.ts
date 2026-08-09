import { type DomainError, domainError } from "../domain/errors";
import {
  type AnalysisFailureReason,
  type IngestionSummary,
  isUsableForVoiceProfile,
} from "../domain/ingestion";
import { type Result, err, ok } from "../lib/result";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { TokenCipher } from "../ports/security";
import type { FetchFailure, XContentClient } from "../ports/x-content-client";

export type IngestAccountPostsDeps = {
  ingestion: IngestionRepository;
  xContent: XContentClient;
  cipher: TokenCipher;
};

export type IngestAccountPostsInput = {
  userId: string;
  maxPosts: number;
};

const toFailureReason = (failure: FetchFailure): AnalysisFailureReason => {
  if (failure.status === 401 || failure.status === 403) return "connection_revoked";
  if (failure.status === 402) return "access_denied";
  if (failure.status === 429) return "rate_limited";
  return "unknown";
};

export async function ingestAccountPosts(
  deps: IngestAccountPostsDeps,
  input: IngestAccountPostsInput,
): Promise<Result<IngestionSummary, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) {
    return err(domainError("x_connection_revoked", "No connected X account found."));
  }

  await deps.ingestion.setAnalysisState(account.id, "running");

  const fetchResult = await deps.xContent.fetchRecentPosts({
    accessToken: deps.cipher.decrypt(account.accessTokenEnc),
    xUserId: account.xUserId,
    maxPosts: input.maxPosts,
    sincePostId: account.lastIngestedPostId,
  });

  if (!fetchResult.ok) {
    const reason = toFailureReason(fetchResult.error);
    await deps.ingestion.setAnalysisState(account.id, "failed", reason);
    return err(domainError("ingestion_failed", fetchResult.error.detail));
  }

  const posts = fetchResult.value;
  const usablePosts = posts.filter(isUsableForVoiceProfile);
  const stored = await deps.ingestion.saveIngestedPosts(account.id, usablePosts);

  const newestPostId = posts.reduce<string | null>(
    (newest, post) => (newest === null || post.xPostId > newest ? post.xPostId : newest),
    null,
  );
  if (newestPostId) {
    await deps.ingestion.updateIngestionWatermark(account.id, newestPostId);
  }

  await deps.ingestion.setAnalysisState(account.id, "complete");

  return ok({ fetched: posts.length, stored, newestPostId });
}
