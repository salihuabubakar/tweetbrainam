import type { AIProvider } from "@tweetbrainam/core";
import { createOpenAICompatibleProvider } from "./openai-compatible";

export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function createGroqProvider(apiKey: string, model = GROQ_DEFAULT_MODEL): AIProvider {
  return createOpenAICompatibleProvider({
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey,
    model,
  });
}
