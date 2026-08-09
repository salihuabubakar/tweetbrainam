import type { AIProvider } from "@tweetbrainam/core";
import { createOpenAICompatibleProvider } from "./openai-compatible";

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export function createOpenAIProvider(apiKey: string, model = OPENAI_DEFAULT_MODEL): AIProvider {
  return createOpenAICompatibleProvider({
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey,
    model,
  });
}
