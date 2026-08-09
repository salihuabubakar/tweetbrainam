import type { AIProvider } from "@tweetbrainam/core";
import { createOpenAICompatibleProvider } from "./openai-compatible";

export const GROK_DEFAULT_MODEL = "grok-3-mini";

export function createGrokProvider(apiKey: string, model = GROK_DEFAULT_MODEL): AIProvider {
  return createOpenAICompatibleProvider({
    name: "grok",
    baseUrl: "https://api.x.ai/v1",
    apiKey,
    model,
  });
}
