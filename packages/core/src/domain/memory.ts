export const memoryCategories = [
  "project",
  "audience",
  "expertise",
  "goal",
  "opinion",
  "preference",
] as const;

export type MemoryCategory = (typeof memoryCategories)[number];

export const memorySources = ["extracted", "user_provided"] as const;

export type MemorySource = (typeof memorySources)[number];

export const memoryStatuses = ["active", "archived"] as const;

export type MemoryStatus = (typeof memoryStatuses)[number];

export type MemoryFact = {
  id: string;
  category: MemoryCategory;
  content: string;
  confidence: number;
  source: MemorySource;
  status: MemoryStatus;
  sourcePostIds: string[];
  createdAt: Date;
};

export type NewMemoryFact = {
  category: MemoryCategory;
  content: string;
  confidence: number;
  source: MemorySource;
  sourcePostIds?: string[];
};

export const MAX_ACTIVE_FACTS = 40;
export const MAX_FACTS_IN_PROMPT = 18;
export const MIN_EXTRACTION_CONFIDENCE = 0.5;

function normalise(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDuplicateFact(candidate: string, existing: string[]): boolean {
  const target = normalise(candidate);
  if (target.length === 0) return true;
  return existing.some((fact) => normalise(fact) === target);
}

export function selectFactsForPrompt(
  facts: MemoryFact[],
  limit = MAX_FACTS_IN_PROMPT,
): MemoryFact[] {
  const active = facts.filter((fact) => fact.status === "active");

  const byPriority = [...active].sort((a, b) => {
    if (a.source !== b.source) return a.source === "user_provided" ? -1 : 1;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const perCategory = new Map<MemoryCategory, number>();
  const cap = Math.max(1, Math.ceil(limit / 3));
  const chosen: MemoryFact[] = [];

  for (const fact of byPriority) {
    if (chosen.length >= limit) break;
    const used = perCategory.get(fact.category) ?? 0;
    if (used >= cap) continue;
    perCategory.set(fact.category, used + 1);
    chosen.push(fact);
  }

  for (const fact of byPriority) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(fact)) chosen.push(fact);
  }

  return chosen;
}
