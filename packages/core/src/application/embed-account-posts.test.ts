import { describe, expect, it } from "vitest";
import { err, ok } from "../lib/result";
import type { EmbeddingProvider } from "../ports/embedding-provider";
import type { IngestionRepository } from "../ports/ingestion-repository";
import { embedAccountPosts } from "./embed-account-posts";

function makeDeps(options: { pending?: number; fails?: boolean; withProvider?: boolean } = {}) {
  let remaining = options.pending ?? 0;
  const saved: { id: string; embedding: number[] }[] = [];
  const purposes: string[] = [];

  const ingestion = {
    listPostsMissingEmbedding: async (_id: string, limit: number) => {
      const take = Math.min(remaining, limit);
      remaining -= take;
      return Array.from({ length: take }, (_, index) => ({
        id: `p${saved.length + index}`,
        text: "a post",
      }));
    },
    saveEmbeddings: async (entries: { id: string; embedding: number[] }[]) => {
      saved.push(...entries);
    },
  } as unknown as IngestionRepository;

  const embeddings: EmbeddingProvider | null =
    options.withProvider === false
      ? null
      : {
          id: "test",
          dimensions: 3,
          embed: async (texts, purpose) => {
            purposes.push(purpose);
            return options.fails
              ? err({ kind: "unavailable" as const, detail: "down" })
              : ok(texts.map(() => [0.1, 0.2, 0.3]));
          },
        };

  return { deps: { ingestion, embeddings }, saved, purposes };
}

describe("embedAccountPosts", () => {
  it("does nothing when no embedding provider is configured", async () => {
    const { deps, saved } = makeDeps({ pending: 10, withProvider: false });

    const result = await embedAccountPosts(deps, { xAccountId: "acc-1" });

    expect(result).toEqual({ embedded: 0, skipped: "no_provider" });
    expect(saved).toHaveLength(0);
  });

  it("embeds everything pending across batches", async () => {
    const { deps, saved } = makeDeps({ pending: 150 });

    const result = await embedAccountPosts(deps, { xAccountId: "acc-1" });

    expect(result.embedded).toBe(150);
    expect(saved).toHaveLength(150);
  });

  it("embeds posts as stored documents, not as queries", async () => {
    const { deps, purposes } = makeDeps({ pending: 10 });

    await embedAccountPosts(deps, { xAccountId: "acc-1" });

    expect(purposes).toEqual(["document"]);
  });

  it("stops at the budget instead of embedding an unbounded corpus", async () => {
    const { deps } = makeDeps({ pending: 5000 });

    const result = await embedAccountPosts(deps, { xAccountId: "acc-1", maxPosts: 100 });

    expect(result.embedded).toBe(100);
  });

  it("reports nothing pending rather than failing", async () => {
    const { deps } = makeDeps({ pending: 0 });

    const result = await embedAccountPosts(deps, { xAccountId: "acc-1" });

    expect(result).toEqual({ embedded: 0, skipped: "nothing_pending" });
  });

  it("gives up quietly when the provider is down", async () => {
    const { deps, saved } = makeDeps({ pending: 10, fails: true });

    const result = await embedAccountPosts(deps, { xAccountId: "acc-1" });

    expect(result.embedded).toBe(0);
    expect(saved).toHaveLength(0);
  });
});
