import { type DomainError, domainError } from "../domain/errors";
import { MIN_POSTS_FOR_VOICE_PROFILE } from "../domain/ingestion";
import { MAX_SAMPLE_POSTS_FOR_ANALYSIS, type VoiceProfile } from "../domain/voice";
import { type Result, err, ok } from "../lib/result";
import type { AIProvider, GenerationUsage } from "../ports/ai-provider";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { VoiceRepository } from "../ports/voice-repository";

export type VoiceAnalysisRequest = {
  system: string;
  prompt: string;
  schema: Parameters<AIProvider["generateObject"]>[0]["schema"];
};

export type BuildVoiceProfileDeps = {
  ingestion: IngestionRepository;
  voice: VoiceRepository;
  ai: AIProvider;
  buildRequest(posts: string[]): VoiceAnalysisRequest;
};

export type BuildVoiceProfileOutput = {
  profile: VoiceProfile;
  usage: GenerationUsage;
};

type AnalysisShape = {
  traits: VoiceProfile["traits"];
  topics: string[];
  sampleSentences: string[];
};

export async function buildVoiceProfile(
  deps: BuildVoiceProfileDeps,
  input: { userId: string },
): Promise<Result<BuildVoiceProfileOutput, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) {
    return err(domainError("x_connection_revoked", "No connected X account found."));
  }

  const posts = await deps.voice.listSamplePosts(account.id, MAX_SAMPLE_POSTS_FOR_ANALYSIS);
  if (posts.length === 0) {
    return err(
      domainError(
        "insufficient_posts",
        "We need some of your posts before we can learn your voice.",
      ),
    );
  }

  const request = deps.buildRequest(posts);
  const generated = await deps.ai.generateObject({
    purpose: "voice_analysis",
    system: request.system,
    prompt: request.prompt,
    schema: request.schema,
  });

  if (!generated.ok) {
    return err(domainError("generation_failed", generated.error.detail));
  }

  const analysis = generated.value.value as AnalysisShape;
  const profile = await deps.voice.saveProfileAsActive({
    xAccountId: account.id,
    traits: analysis.traits,
    topics: analysis.topics,
    sampleSentences: analysis.sampleSentences,
    source: "analysis",
    postsAnalyzed: posts.length,
  });

  return ok({ profile, usage: generated.value.usage });
}

export const hasEnoughPostsForConfidentProfile = (postCount: number): boolean =>
  postCount >= MIN_POSTS_FOR_VOICE_PROFILE;
