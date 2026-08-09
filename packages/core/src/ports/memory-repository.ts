import type { MemoryCategory, MemoryFact, MemoryStatus, NewMemoryFact } from "../domain/memory";

export type MemoryRepository = {
  listForUser(userId: string, status: MemoryStatus): Promise<MemoryFact[]>;
  countActive(userId: string): Promise<number>;
  addFacts(userId: string, facts: NewMemoryFact[]): Promise<MemoryFact[]>;
  updateFact(
    factId: string,
    patch: { content?: string; category?: MemoryCategory },
  ): Promise<MemoryFact | null>;
  setStatus(factId: string, status: MemoryStatus): Promise<void>;
  findOwner(factId: string): Promise<string | null>;
};
