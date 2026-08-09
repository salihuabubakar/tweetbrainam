import { type EmbeddingProvider, MAX_EMBEDDING_BATCH } from "../ports/embedding-provider";
import type { IngestionRepository } from "../ports/ingestion-repository";

export const EMBEDDING_BATCH_SIZE = MAX_EMBEDDING_BATCH;

export type EmbedAccountPostsDeps = {
  ingestion: IngestionRepository;
  embeddings: EmbeddingProvider | null;
};

export type EmbedAccountPostsOutput = {
  embedded: number;
  skipped: "no_provider" | "nothing_pending" | null;
};

export async function embedAccountPosts(
  deps: EmbedAccountPostsDeps,
  input: { xAccountId: string; maxPosts?: number },
): Promise<EmbedAccountPostsOutput> {
  if (!deps.embeddings) return { embedded: 0, skipped: "no_provider" };

  const budget = input.maxPosts ?? EMBEDDING_BATCH_SIZE * 6;
  let embedded = 0;

  while (embedded < budget) {
    const batchSize = Math.min(EMBEDDING_BATCH_SIZE, budget - embedded);
    const pending = await deps.ingestion.listPostsMissingEmbedding(input.xAccountId, batchSize);
    if (pending.length === 0) break;

    const vectors = await deps.embeddings.embed(
      pending.map((post) => post.text),
      "document",
    );
    if (!vectors.ok) break;

    const entries = pending.flatMap((post, index) => {
      const embedding = vectors.value[index];
      return embedding ? [{ id: post.id, embedding }] : [];
    });

    if (entries.length === 0) break;

    await deps.ingestion.saveEmbeddings(entries);
    embedded += entries.length;

    if (pending.length < batchSize) break;
  }

  if (embedded === 0) return { embedded: 0, skipped: "nothing_pending" };
  return { embedded, skipped: null };
}
