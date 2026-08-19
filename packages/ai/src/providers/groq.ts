import type { AIProvider } from "@tweetbrainam/core";
import { createOpenAICompatibleProvider } from "./openai-compatible";

export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

export function createGroqProvider(apiKey: string, model?: string): AIProvider {
  return createOpenAICompatibleProvider({
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey,
    model: model ?? GROQ_DEFAULT_MODEL,
  });
}
