import { describe, expect, it } from "vitest";
import { extractSearchTerms, isUsableExample } from "../domain/retrieval";
import { err, ok } from "../lib/result";
import type { EmbeddingProvider } from "../ports/embedding-provider";
import type { ExamplePost, IngestionRepository } from "../ports/ingestion-repository";
import { retrieveDraftExamples } from "./retrieve-draft-examples";

const post = (id: string, text: string): ExamplePost => ({
  id,
  text,
  likes: 3,
  postedAt: new Date("2026-08-01T00:00:00Z"),
});

const longEnough =
  "We shipped the migration today and nothing caught fire, which is its own reward.";

function makeDeps(options: {
  similar?: ExamplePost[];
  matched?: ExamplePost[];
  embeddingFails?: boolean;
  withProvider?: boolean;
}) {
  const calls = { similar: 0, matched: 0, embed: 0 };

  const ingestion = {
    findSimilarPosts: async () => {
      calls.similar += 1;
      return options.similar ?? [];
    },
    findPostsMatchingTerms: async () => {
      calls.matched += 1;
      return options.matched ?? [];
    },
  } as unknown as IngestionRepository;

  const purposes: string[] = [];

  const embeddings: EmbeddingProvider | null =
    options.withProvider === false
      ? null
      : {
          id: "test",
          dimensions: 3,
          embed: async (_texts, purpose) => {
            calls.embed += 1;
            purposes.push(purpose);
            return options.embeddingFails
              ? err({ kind: "unavailable" as const, detail: "down" })
              : ok([[0.1, 0.2, 0.3]]);
          },
        };

  return { deps: { ingestion, embeddings }, calls, purposes };
}

const input = { xAccountId: "acc-1", topic: "Shipping", angle: "What we learned" };

describe("retrieveDraftExamples", () => {
  it("prefers embedding similarity when a provider is configured", async () => {
    const { deps, calls } = makeDeps({ similar: [post("1", longEnough)] });

    const result = await retrieveDraftExamples(deps, input);

    expect(result.strategy).toBe("similarity");
    expect(result.posts).toHaveLength(1);
    expect(calls.matched).toBe(0);
  });

  it("embeds the topic as a query, not as a stored document", async () => {
    const { deps, purposes } = makeDeps({ similar: [post("1", longEnough)] });

    await retrieveDraftExamples(deps, input);

    expect(purposes).toEqual(["query"]);
  });

  it("falls back to keyword matching when no embedding provider is set", async () => {
    const { deps, calls } = makeDeps({
      withProvider: false,
      matched: [post("2", longEnough)],
    });

    const result = await retrieveDraftExamples(deps, input);

    expect(result.strategy).toBe("keyword");
    expect(calls.embed).toBe(0);
    expect(calls.similar).toBe(0);
  });

  it("falls back to keyword matching when embedding fails", async () => {
    const { deps } = makeDeps({ embeddingFails: true, matched: [post("3", longEnough)] });

    const result = await retrieveDraftExamples(deps, input);

    expect(result.strategy).toBe("keyword");
  });

  it("falls back when the account has posts but none are embedded yet", async () => {
    const { deps } = makeDeps({ similar: [], matched: [post("4", longEnough)] });

    const result = await retrieveDraftExamples(deps, input);

    expect(result.strategy).toBe("keyword");
  });

  it("discards examples too short to teach anything", async () => {
    const { deps } = makeDeps({ similar: [post("5", "shipped it")], matched: [] });

    const result = await retrieveDraftExamples(deps, input);

    expect(result.strategy).toBe("none");
    expect(result.posts).toEqual([]);
  });

  it("reports no examples rather than inventing them", async () => {
    const { deps } = makeDeps({});

    const result = await retrieveDraftExamples(deps, input);

    expect(result).toEqual({ posts: [], strategy: "none" });
  });
});

describe("extractSearchTerms", () => {
  it("keeps meaningful words and drops filler", () => {
    expect(extractSearchTerms("Shipping fast", "What we have learned about the process")).toEqual([
      "shipping",
      "fast",
      "learned",
      "process",
    ]);
  });

  it("does not repeat a term that appears in both the topic and the angle", () => {
    expect(extractSearchTerms("hiring", "hiring slowly")).toEqual(["hiring", "slowly"]);
  });
});

describe("isUsableExample", () => {
  it("rejects a post too short to carry a voice", () => {
    expect(isUsableExample("shipped it")).toBe(false);
    expect(isUsableExample(longEnough)).toBe(true);
  });
});
