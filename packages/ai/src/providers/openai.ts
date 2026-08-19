import type { AIProvider } from "@tweetbrainam/core";
import { createOpenAICompatibleProvider } from "./openai-compatible";

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export function createOpenAIProvider(apiKey: string, model?: string): AIProvider {
  return createOpenAICompatibleProvider({
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey,
    model: model ?? OPENAI_DEFAULT_MODEL,
  });
}
