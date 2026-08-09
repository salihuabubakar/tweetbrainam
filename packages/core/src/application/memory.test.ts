import { describe, expect, it } from "vitest";
import { MAX_ACTIVE_FACTS, type MemoryFact, type NewMemoryFact } from "../domain/memory";
import { ok } from "../lib/result";
import type { AIProvider } from "../ports/ai-provider";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { MemoryRepository } from "../ports/memory-repository";
import type { VoiceRepository } from "../ports/voice-repository";
import { addMemoryFact, archiveMemoryFact, updateMemoryFact } from "./edit-memory-facts";
import { extractMemoryFacts } from "./extract-memory-facts";

const existingFact = (content: string): MemoryFact => ({
  id: "f1",
  category: "project",
  content,
  confidence: 0.9,
  source: "extracted",
  status: "active",
  sourcePostIds: [],
  createdAt: new Date("2026-08-01T00:00:00Z"),
});

function makeMemory(options: { active?: MemoryFact[]; owner?: string | null } = {}) {
  const added: NewMemoryFact[] = [];
  const statuses: string[] = [];

  const memory = {
    listForUser: async () => options.active ?? [],
    countActive: async () => (options.active ?? []).length,
    addFacts: async (_userId: string, facts: NewMemoryFact[]) => {
      added.push(...facts);
      return facts.map((entry, index) => ({
        ...existingFact(entry.content),
        id: `new-${index}`,
        category: entry.category,
        confidence: entry.confidence,
        source: entry.source,
      }));
    },
    updateFact: async (_id: string, patch: { content?: string }) =>
      existingFact(patch.content ?? "unchanged"),
    setStatus: async (_id: string, status: string) => {
      statuses.push(status);
    },
    findOwner: async () => ("owner" in options ? options.owner : "u1"),
  } as unknown as MemoryRepository;

  return { memory, added, statuses };
}

function makeExtractionDeps(options: {
  facts: { category: string; content: string; confidence: number }[];
  active?: MemoryFact[];
  posts?: string[];
}) {
  const { memory, added } = makeMemory({ active: options.active ?? [] });

  const ingestion = {
    findAccountByUserId: async () => ({ id: "acc-1" }),
  } as unknown as IngestionRepository;

  const voice = {
    listSamplePosts: async () => options.posts ?? ["a post about shipping"],
  } as unknown as VoiceRepository;

  const ai = {
    generateObject: async () =>
      ok({
        value: { facts: options.facts },
        usage: { provider: "test", inputTokens: 1, outputTokens: 1, latencyMs: 1 },
      }),
  } as unknown as AIProvider;

  const deps = {
    ingestion,
    voice,
    memory,
    ai,
    buildRequest: () => ({ system: "s", prompt: "p", schema: {} as never }),
  };

  return { deps, added };
}

describe("extractMemoryFacts", () => {
  it("saves confident new facts as extracted", async () => {
    const { deps, added } = makeExtractionDeps({
      facts: [{ category: "project", content: "They are building a scheduler.", confidence: 0.9 }],
    });

    const result = await extractMemoryFacts(deps, { userId: "u1" });

    expect(result.ok).toBe(true);
    expect(added).toHaveLength(1);
    expect(added[0]?.source).toBe("extracted");
  });

  it("drops guesses below the confidence floor", async () => {
    const { deps, added } = makeExtractionDeps({
      facts: [{ category: "project", content: "They might live in Lagos.", confidence: 0.3 }],
    });

    await extractMemoryFacts(deps, { userId: "u1" });

    expect(added).toEqual([]);
  });

  it("does not re-add something we already know", async () => {
    const { deps, added } = makeExtractionDeps({
      active: [existingFact("They are building a scheduler.")],
      facts: [{ category: "project", content: "They are building a scheduler!", confidence: 0.9 }],
    });

    const result = await extractMemoryFacts(deps, { userId: "u1" });

    expect(added).toEqual([]);
    expect(result.ok && result.value.skippedDuplicates).toBe(1);
  });

  it("does not repeat a fact the model returned twice in one pass", async () => {
    const { deps, added } = makeExtractionDeps({
      facts: [
        { category: "project", content: "They are building a scheduler.", confidence: 0.9 },
        { category: "goal", content: "They are building a scheduler", confidence: 0.8 },
      ],
    });

    await extractMemoryFacts(deps, { userId: "u1" });

    expect(added).toHaveLength(1);
  });

  it("stops adding once the profile is full", async () => {
    const active = Array.from({ length: MAX_ACTIVE_FACTS }, (_, index) =>
      existingFact(`Known fact ${index}`),
    );
    const { deps, added } = makeExtractionDeps({
      active,
      facts: [{ category: "project", content: "Something brand new.", confidence: 0.9 }],
    });

    await extractMemoryFacts(deps, { userId: "u1" });

    expect(added).toEqual([]);
  });

  it("refuses to guess when there are no posts to read", async () => {
    const { deps } = makeExtractionDeps({ facts: [], posts: [] });

    const result = await extractMemoryFacts(deps, { userId: "u1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("insufficient_posts");
  });
});

describe("addMemoryFact", () => {
  it("stores a fact the user typed as user_provided with full confidence", async () => {
    const { memory, added } = makeMemory();

    const result = await addMemoryFact(
      { memory },
      { userId: "u1", category: "goal", content: "They want 10k followers." },
    );

    expect(result.ok).toBe(true);
    expect(added[0]?.source).toBe("user_provided");
    expect(added[0]?.confidence).toBe(1);
  });

  it("refuses a duplicate of something already known", async () => {
    const { memory } = makeMemory({ active: [existingFact("They ship on Fridays.")] });

    const result = await addMemoryFact(
      { memory },
      { userId: "u1", category: "preference", content: "they ship on fridays" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("validation_failed");
  });

  it("refuses once the profile is full", async () => {
    const active = Array.from({ length: MAX_ACTIVE_FACTS }, (_, index) =>
      existingFact(`Known ${index}`),
    );
    const { memory } = makeMemory({ active });

    const result = await addMemoryFact(
      { memory },
      { userId: "u1", category: "goal", content: "One more thing." },
    );

    expect(result.ok).toBe(false);
  });
});

describe("memory fact ownership", () => {
  it("will not let one user edit another user's fact", async () => {
    const { memory } = makeMemory({ owner: "someone-else" });

    const result = await updateMemoryFact(
      { memory },
      { userId: "u1", factId: "f1", content: "Rewritten." },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });

  it("will not let one user archive another user's fact", async () => {
    const { memory, statuses } = makeMemory({ owner: "someone-else" });

    const result = await archiveMemoryFact({ memory }, { userId: "u1", factId: "f1" });

    expect(result.ok).toBe(false);
    expect(statuses).toEqual([]);
  });

  it("archives rather than deletes, so the fact can be audited", async () => {
    const { memory, statuses } = makeMemory();

    const result = await archiveMemoryFact({ memory }, { userId: "u1", factId: "f1" });

    expect(result.ok).toBe(true);
    expect(statuses).toEqual(["archived"]);
  });
});
