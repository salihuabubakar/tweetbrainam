import type { DraftSegment } from "../domain/drafting";
import type { Draft } from "../domain/drafting";
import { type DomainError, domainError } from "../domain/errors";
import { selectFactsForPrompt } from "../domain/memory";
import type { PostFormat } from "../domain/planning";
import { type Result, err, ok } from "../lib/result";
import type { AIProvider, GenerationUsage } from "../ports/ai-provider";
import type { DraftRepository } from "../ports/draft-repository";
import type { EmbeddingProvider } from "../ports/embedding-provider";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { MemoryRepository } from "../ports/memory-repository";
import type { PlanRepository } from "../ports/plan-repository";
import type { VoiceRepository } from "../ports/voice-repository";
import { type QuotaDeps, checkUserQuota, recordUsage } from "./enforce-quota";
import { retrieveDraftExamples } from "./retrieve-draft-examples";

export type DraftPromptContext = {
  topic: string;
  angle: string;
  format: PostFormat;
  tones: string[];
  formality: number;
  averageSentenceLength: string;
  usesEmoji: boolean;
  usesHashtags: boolean;
  rules: string[];
  vocabularyQuirks: string[];
  sampleSentences: string[];
  examplePosts: string[];
  memoryFacts: string[];
  guidance?: string | undefined;
};

export type DraftRequest = {
  system: string;
  prompt: string;
  schema: Parameters<AIProvider["generateObject"]>[0]["schema"];
};

export type GenerateDraftDeps = QuotaDeps & {
  drafts: DraftRepository;
  plans: PlanRepository;
  voice: VoiceRepository;
  ingestion: IngestionRepository;
  memory: MemoryRepository;
  embeddings: EmbeddingProvider | null;
  ai: AIProvider;
  buildRequest(context: DraftPromptContext): DraftRequest;
};

export type DraftBrief = {
  topic: string;
  angle: string;
  format: PostFormat;
};

export type GenerateDraftInput = {
  userId: string;
  planSlotId?: string | undefined;
  brief?: DraftBrief | undefined;
  guidance?: string | undefined;
  isFinalAttempt?: boolean;
};

export type GenerateDraftOutput = {
  draft: Draft;
  usage: GenerationUsage;
};

export async function generateDraft(
  deps: GenerateDraftDeps,
  input: GenerateDraftInput,
): Promise<Result<GenerateDraftOutput, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) {
    return err(domainError("x_connection_revoked", "No connected X account found."));
  }

  const quota = await checkUserQuota(deps, { userId: input.userId, metric: "draft_generated" });
  if (!quota.ok) return quota;

  const slot = input.planSlotId ? await deps.plans.findSlotById(input.planSlotId) : null;
  if (input.planSlotId && !slot) {
    return err(domainError("not_found", "That planned post no longer exists."));
  }

  const brief: DraftBrief | null = slot
    ? { topic: slot.topic, angle: slot.angle, format: slot.format }
    : (input.brief ?? null);

  if (!brief) {
    return err(domainError("validation_failed", "Tell us what to write about."));
  }

  const profile = await deps.voice.findActiveProfile(account.id);
  if (!profile) {
    return err(domainError("voice_profile_missing", "We need your voice profile before writing."));
  }

  const existing = slot ? await deps.drafts.findBySlot(slot.id) : null;
  const draft = existing ?? (await deps.drafts.createGenerating(account.id, slot?.id ?? null));
  await deps.drafts.setStatus(draft.id, "generating");
  if (slot) await deps.plans.updateSlotStatus(slot.id, "drafting");

  const examples = await retrieveDraftExamples(deps, {
    xAccountId: account.id,
    topic: brief.topic,
    angle: brief.angle,
  });

  const facts = await deps.memory.listForUser(input.userId, "active");

  const request = deps.buildRequest({
    topic: brief.topic,
    angle: brief.angle,
    format: brief.format,
    tones: profile.traits.tones,
    formality: profile.traits.formality,
    averageSentenceLength: profile.traits.averageSentenceLength,
    usesEmoji: profile.traits.usesEmoji,
    usesHashtags: profile.traits.usesHashtags,
    rules: profile.traits.rules,
    vocabularyQuirks: profile.traits.vocabularyQuirks,
    sampleSentences: profile.sampleSentences,
    examplePosts: examples.posts.map((post) => post.text),
    memoryFacts: selectFactsForPrompt(facts).map((fact) => fact.content),
    guidance: input.guidance,
  });

  const generated = await deps.ai.generateObject({
    purpose: "draft",
    system: request.system,
    prompt: request.prompt,
    schema: request.schema,
  });

  if (!generated.ok) {
    if (input.isFinalAttempt ?? true) {
      await deps.drafts.setStatus(draft.id, "failed");
      if (slot) await deps.plans.updateSlotStatus(slot.id, "empty");
    }
    return err(domainError("generation_failed", generated.error.detail));
  }

  await recordUsage(deps, { userId: input.userId, metric: "draft_generated" });

  const segments = (generated.value.value as { segments: DraftSegment[] }).segments;
  const withVersion = await deps.drafts.addVersion(draft.id, segments, "ai");
  await deps.drafts.setStatus(draft.id, "needs_review");
  if (slot) await deps.plans.updateSlotStatus(slot.id, "ready");

  if (input.guidance) {
    await deps.drafts.recordLearningSignal({
      xAccountId: account.id,
      draftId: draft.id,
      type: "regeneration_note",
      payload: { guidance: input.guidance },
    });
  }

  return ok({
    draft: { ...withVersion, status: "needs_review" },
    usage: generated.value.usage,
  });
}
