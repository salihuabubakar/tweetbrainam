import type { AIFailure, AIProvider } from "@tweetbrainam/core";
import { err } from "@tweetbrainam/core";

const RETRYABLE: AIFailure["kind"][] = ["unavailable", "rate_limited"];

export function createFailoverProvider(providers: AIProvider[]): AIProvider {
  if (providers.length === 0) {
    throw new Error("At least one AI provider must be configured.");
  }

  return {
    name: providers.map((provider) => provider.name).join("→"),

    async generateObject(input) {
      let lastFailure: AIFailure = { kind: "unknown", detail: "No provider attempted." };

      for (const provider of providers) {
        const result = await provider.generateObject(input);
        if (result.ok) return result;

        lastFailure = result.error;
        if (!RETRYABLE.includes(result.error.kind)) return result;
      }

      return err(lastFailure);
    },
  };
}
