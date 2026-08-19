import { type DomainError, domainError } from "../domain/errors";
import {
  type AnalysisFailureReason,
  type IngestionSummary,
  isUsableForVoiceProfile,
} from "../domain/ingestion";
import { PLAN_SCAN_LIMITS } from "../domain/usage";
import { type Result, err, ok } from "../lib/result";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { VoiceBuildTrigger } from "../ports/job-runner";
import type { FetchFailure, XContentClient } from "../ports/x-content-client";
import type { XTokenProvider } from "../ports/x-token-provider";
import { type QuotaDeps, loadSubscription } from "./enforce-quota";

export type IngestAccountPostsDeps = QuotaDeps & {
  ingestion: IngestionRepository;
  xContent: XContentClient;
  tokens: XTokenProvider;
  jobs: VoiceBuildTrigger;
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

  const subscription = await loadSubscription(deps, input.userId);
  const alreadyStored = await deps.ingestion.countIngestedPosts(account.id);
  const scanBudget = PLAN_SCAN_LIMITS[subscription.planCode] - alreadyStored;

  if (scanBudget <= 0) {
    await deps.ingestion.setAnalysisState(account.id, "complete");
    if (alreadyStored > 0) await deps.jobs.startVoiceProfileBuild(input.userId);
    return ok({ fetched: 0, stored: 0, newestPostId: null });
  }

  await deps.ingestion.setAnalysisState(account.id, "running");

  const accessToken = await deps.tokens.accessTokenFor(account.id);
  if (!accessToken) {
    await deps.ingestion.setAnalysisState(account.id, "failed", "connection_revoked");
    return err(domainError("x_connection_revoked", "Your X connection needs reconnecting."));
  }

  const fetchResult = await deps.xContent.fetchRecentPosts({
    accessToken,
    xUserId: account.xUserId,
    maxPosts: Math.min(input.maxPosts, scanBudget),
    sincePostId: account.lastIngestedPostId,
  });

  if (!fetchResult.ok) {
    const reason = toFailureReason(fetchResult.error);
    await deps.ingestion.setAnalysisState(account.id, "failed", reason);
    return err(domainError("ingestion_failed", fetchResult.error.detail));
  }

  const posts = fetchResult.value;
  const usablePosts = posts.filter(isUsableForVoiceProfile).slice(0, scanBudget);
  const stored = await deps.ingestion.saveIngestedPosts(account.id, usablePosts);

  const newestPostId = posts.reduce<string | null>(
    (newest, post) => (newest === null || post.xPostId > newest ? post.xPostId : newest),
    null,
  );
  if (newestPostId) {
    await deps.ingestion.updateIngestionWatermark(account.id, newestPostId);
  }

  await deps.ingestion.setAnalysisState(account.id, "complete");

  if (alreadyStored + stored > 0) {
    await deps.jobs.startVoiceProfileBuild(input.userId);
  }

  return ok({ fetched: posts.length, stored, newestPostId });
}
