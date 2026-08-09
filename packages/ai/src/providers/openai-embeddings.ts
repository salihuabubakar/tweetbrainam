import { type EmbeddingProvider, err, ok } from "@tweetbrainam/core";
import { z } from "zod";

export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const OPENAI_EMBEDDING_DIMENSIONS = 1536;

const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

const responseSchema = z.object({
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })),
});

export function createOpenAIEmbeddingProvider(
  apiKey: string,
  model = OPENAI_EMBEDDING_MODEL,
): EmbeddingProvider {
  return {
    id: "openai",
    dimensions: OPENAI_EMBEDDING_DIMENSIONS,

    async embed(texts) {
      if (texts.length === 0) return ok([]);

      let response: Response;
      try {
        response = await fetch(EMBEDDINGS_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ model, input: texts }),
        });
      } catch (cause) {
        return err({
          kind: "unavailable",
          detail: `openai embeddings unreachable: ${String(cause)}`,
        });
      }

      if (response.status === 429) {
        return err({ kind: "rate_limited", detail: "openai embeddings rate limited" });
      }

      if (!response.ok) {
        return err({
          kind: "unavailable",
          detail: `openai embeddings failed: ${response.status} ${await response.text()}`,
        });
      }

      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        return err({
          kind: "invalid_output",
          detail: "openai embeddings returned an unexpected shape",
        });
      }

      const ordered = [...parsed.data.data].sort((a, b) => a.index - b.index);
      return ok(ordered.map((entry) => entry.embedding));
    },
  };
}
