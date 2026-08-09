import { type DomainError, domainError } from "../domain/errors";
import type { VoiceProfile, VoiceTraits } from "../domain/voice";
import { type Result, err, ok } from "../lib/result";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { VoiceRepository } from "../ports/voice-repository";

export type EditVoiceProfileDeps = {
  ingestion: IngestionRepository;
  voice: VoiceRepository;
};

export type EditVoiceProfileInput = {
  userId: string;
  traits: VoiceTraits;
  topics: string[];
};

export async function editVoiceProfile(
  deps: EditVoiceProfileDeps,
  input: EditVoiceProfileInput,
): Promise<Result<VoiceProfile, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) return err(domainError("x_connection_revoked", "No connected X account."));

  const active = await deps.voice.findActiveProfile(account.id);
  if (!active) {
    return err(
      domainError("voice_profile_missing", "There's nothing to edit until we've read your posts."),
    );
  }

  const isUnchanged =
    JSON.stringify(active.traits) === JSON.stringify(input.traits) &&
    JSON.stringify(active.topics) === JSON.stringify(input.topics);

  if (isUnchanged) return ok(active);

  const saved = await deps.voice.saveProfileAsActive({
    xAccountId: account.id,
    traits: input.traits,
    topics: input.topics,
    sampleSentences: active.sampleSentences,
    source: "user_edit",
    postsAnalyzed: active.postsAnalyzed,
  });

  return ok(saved);
}
