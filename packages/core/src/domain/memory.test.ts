import { describe, expect, it } from "vitest";
import {
  MAX_FACTS_IN_PROMPT,
  type MemoryFact,
  isDuplicateFact,
  selectFactsForPrompt,
} from "./memory";

const fact = (overrides: Partial<MemoryFact> = {}): MemoryFact => ({
  id: crypto.randomUUID(),
  category: "project",
  content: "They are building a scheduling tool.",
  confidence: 0.8,
  source: "extracted",
  status: "active",
  sourcePostIds: [],
  createdAt: new Date("2026-08-01T00:00:00Z"),
  ...overrides,
});

describe("isDuplicateFact", () => {
  it("catches the same fact written with different punctuation and case", () => {
    expect(
      isDuplicateFact("They are building a scheduling tool!", [
        "they are building a scheduling tool",
      ]),
    ).toBe(true);
  });

  it("treats a genuinely different fact as new", () => {
    expect(isDuplicateFact("They write in British English.", ["They are building a tool."])).toBe(
      false,
    );
  });

  it("rejects empty content rather than storing it", () => {
    expect(isDuplicateFact("   ", [])).toBe(true);
  });
});

describe("selectFactsForPrompt", () => {
  it("leaves archived facts out of the prompt", () => {
    const facts = [fact({ status: "archived" }), fact({ content: "Active one." })];

    const selected = selectFactsForPrompt(facts);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.content).toBe("Active one.");
  });

  it("puts what the user told us ahead of what we guessed", () => {
    const facts = [
      fact({ confidence: 0.95, content: "Extracted, high confidence." }),
      fact({ confidence: 0.5, source: "user_provided", content: "User said so." }),
    ];

    expect(selectFactsForPrompt(facts)[0]?.content).toBe("User said so.");
  });

  it("does not let one category crowd out the rest", () => {
    const projects = Array.from({ length: 20 }, (_, index) =>
      fact({ category: "project", content: `Project ${index}`, confidence: 0.99 }),
    );
    const audience = fact({ category: "audience", content: "They write for backend devs." });

    const selected = selectFactsForPrompt([...projects, audience]);

    expect(selected.some((item) => item.category === "audience")).toBe(true);
  });

  it("fills the remaining room rather than returning a short list", () => {
    const facts = Array.from({ length: 30 }, (_, index) =>
      fact({ category: "project", content: `Project ${index}` }),
    );

    expect(selectFactsForPrompt(facts)).toHaveLength(MAX_FACTS_IN_PROMPT);
  });

  it("never repeats a fact when topping up past the per-category cap", () => {
    const facts = Array.from({ length: 30 }, (_, index) =>
      fact({ category: "project", content: `Project ${index}` }),
    );

    const selected = selectFactsForPrompt(facts);

    expect(new Set(selected.map((item) => item.id)).size).toBe(selected.length);
  });
});
