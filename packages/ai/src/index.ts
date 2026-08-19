import type { AIProvider, EmbeddingProvider } from "@tweetbrainam/core";
import { createFailoverProvider } from "./failover";
import { createCohereEmbeddingProvider } from "./providers/cohere-embeddings";
import { createGrokProvider } from "./providers/grok";
import { createGroqProvider } from "./providers/groq";
import { createOpenAIProvider } from "./providers/openai";
import { createOpenAIEmbeddingProvider } from "./providers/openai-embeddings";

export type AIProviderName = "groq" | "grok" | "openai";

export type AIProviderKeys = Partial<Record<AIProviderName, string>>;

export type AIProviderModels = Partial<Record<AIProviderName, string>>;

const factories: Record<AIProviderName, (apiKey: string, model?: string) => AIProvider> = {
  groq: createGroqProvider,
  grok: createGrokProvider,
  openai: createOpenAIProvider,
};

export function resolveAIProvider(
  order: AIProviderName[],
  keys: AIProviderKeys,
  models: AIProviderModels = {},
): AIProvider {
  const available = order
    .filter((name) => Boolean(keys[name]))
    .map((name) => factories[name](keys[name] as string, models[name]));

  if (available.length === 0) {
    const configured = Object.keys(keys).filter((name) => Boolean(keys[name as AIProviderName]));
    throw new Error(
      [
        "No AI provider configured.",
        `AI_FAILOVER_ORDER resolved to: [${order.join(", ") || "none"}].`,
        `Keys present: [${configured.join(", ") || "none"}].`,
        "Set a key for a provider that appears in the order, then restart the process — env is read at boot.",
      ].join(" "),
    );
  }

  return createFailoverProvider(available);
}

export type EmbeddingKeys = {
  cohere?: string | undefined;
  openai?: string | undefined;
};

export function resolveEmbeddingProvider(keys: EmbeddingKeys): EmbeddingProvider | null {
  if (keys.cohere) return createCohereEmbeddingProvider(keys.cohere);
  if (keys.openai) return createOpenAIEmbeddingProvider(keys.openai);
  return null;
}

export { createFailoverProvider } from "./failover";
export {
  createCohereEmbeddingProvider,
  COHERE_EMBEDDING_DIMENSIONS,
  COHERE_EMBEDDING_MODEL,
} from "./providers/cohere-embeddings";
export {
  createOpenAIEmbeddingProvider,
  OPENAI_EMBEDDING_DIMENSIONS,
  OPENAI_EMBEDDING_MODEL,
} from "./providers/openai-embeddings";
export { createGrokProvider, GROK_DEFAULT_MODEL } from "./providers/grok";
export { createGroqProvider, GROQ_DEFAULT_MODEL } from "./providers/groq";
export { createOpenAIProvider, OPENAI_DEFAULT_MODEL } from "./providers/openai";
export { buildVoiceAnalysisPrompt, VOICE_ANALYSIS_SYSTEM } from "./prompts/voice-analysis";
export {
  buildMemoryExtractionPrompt,
  MEMORY_EXTRACTION_SYSTEM,
  type MemoryExtractionInput,
} from "./prompts/memory-extraction";
export {
  buildDraftPrompt,
  DRAFT_POST_SYSTEM,
  type DraftPromptInput,
} from "./prompts/draft-post";
export {
  buildWeeklyPlanPrompt,
  WEEKLY_PLAN_SYSTEM,
  type WeeklyPlanInput,
} from "./prompts/weekly-plan";
