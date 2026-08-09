import { type DomainError, domainError } from "../domain/errors";
import {
  MAX_ACTIVE_FACTS,
  MIN_EXTRACTION_CONFIDENCE,
  type MemoryFact,
  type NewMemoryFact,
  isDuplicateFact,
} from "../domain/memory";
import { MAX_SAMPLE_POSTS_FOR_ANALYSIS } from "../domain/voice";
import { type Result, err, ok } from "../lib/result";
import type { AIProvider, GenerationUsage } from "../ports/ai-provider";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { MemoryRepository } from "../ports/memory-repository";
import type { VoiceRepository } from "../ports/voice-repository";

export type MemoryExtractionRequest = {
  system: string;
  prompt: string;
  schema: Parameters<AIProvider["generateObject"]>[0]["schema"];
};

export type ExtractMemoryFactsDeps = {
  ingestion: IngestionRepository;
  voice: VoiceRepository;
  memory: MemoryRepository;
  ai: AIProvider;
  buildRequest(input: { posts: string[]; existingFacts: string[] }): MemoryExtractionRequest;
};

export type ExtractMemoryFactsOutput = {
  added: MemoryFact[];
  skippedDuplicates: number;
  usage: GenerationUsage;
};

type ExtractedFact = {
  category: NewMemoryFact["category"];
  content: string;
  confidence: number;
};

export async function extractMemoryFacts(
  deps: ExtractMemoryFactsDeps,
  input: { userId: string },
): Promise<Result<ExtractMemoryFactsOutput, DomainError>> {
  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) return err(domainError("x_connection_revoked", "No connected X account."));

  const posts = await deps.voice.listSamplePosts(account.id, MAX_SAMPLE_POSTS_FOR_ANALYSIS);
  if (posts.length === 0) {
    return err(
      domainError("insufficient_posts", "We need some of your posts before we can learn."),
    );
  }

  const existing = await deps.memory.listForUser(input.userId, "active");
  const existingContents = existing.map((fact) => fact.content);

  const request = deps.buildRequest({ posts, existingFacts: existingContents });
  const generated = await deps.ai.generateObject({
    purpose: "memory_extraction",
    system: request.system,
    prompt: request.prompt,
    schema: request.schema,
  });

  if (!generated.ok) {
    return err(domainError("generation_failed", generated.error.detail));
  }

  const extracted = (generated.value.value as { facts: ExtractedFact[] }).facts;
  const room = Math.max(0, MAX_ACTIVE_FACTS - existing.length);
  const accepted: NewMemoryFact[] = [];
  const seen = [...existingContents];
  let skippedDuplicates = 0;

  for (const fact of extracted) {
    if (accepted.length >= room) break;
    if (fact.confidence < MIN_EXTRACTION_CONFIDENCE) continue;
    if (isDuplicateFact(fact.content, seen)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.push(fact.content);
    accepted.push({
      category: fact.category,
      content: fact.content,
      confidence: fact.confidence,
      source: "extracted",
    });
  }

  const added = await deps.memory.addFacts(input.userId, accepted);
  return ok({ added, skippedDuplicates, usage: generated.value.usage });
}
