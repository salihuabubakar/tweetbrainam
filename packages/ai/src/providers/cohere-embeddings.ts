import { type EmbeddingProvider, type EmbeddingPurpose, err, ok } from "@tweetbrainam/core";
import { z } from "zod";

export const COHERE_EMBEDDING_MODEL = "embed-v4.0";
export const COHERE_EMBEDDING_DIMENSIONS = 1536;

const EMBED_URL = "https://api.cohere.com/v2/embed";

const inputTypes: Record<EmbeddingPurpose, string> = {
  document: "search_document",
  query: "search_query",
};

const responseSchema = z.object({
  embeddings: z.object({ float: z.array(z.array(z.number())) }),
});

export function createCohereEmbeddingProvider(
  apiKey: string,
  model = COHERE_EMBEDDING_MODEL,
): EmbeddingProvider {
  return {
    id: "cohere",
    dimensions: COHERE_EMBEDDING_DIMENSIONS,

    async embed(texts, purpose) {
      if (texts.length === 0) return ok([]);

      let response: Response;
      try {
        response = await fetch(EMBED_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            texts,
            input_type: inputTypes[purpose],
            embedding_types: ["float"],
            output_dimension: COHERE_EMBEDDING_DIMENSIONS,
            truncate: "END",
          }),
        });
      } catch (cause) {
        return err({
          kind: "unavailable",
          detail: `cohere embeddings unreachable: ${String(cause)}`,
        });
      }

      if (response.status === 429) {
        return err({ kind: "rate_limited", detail: "cohere embeddings rate limited" });
      }

      if (!response.ok) {
        return err({
          kind: "unavailable",
          detail: `cohere embeddings failed: ${response.status} ${await response.text()}`,
        });
      }

      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        return err({
          kind: "invalid_output",
          detail: "cohere embeddings returned an unexpected shape",
        });
      }

      return ok(parsed.data.embeddings.float);
    },
  };
}
