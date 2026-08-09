import type { MemoryFact, MemoryRepository } from "@tweetbrainam/core";
import { and, count, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { type MemoryFactRow, memoryFacts } from "../schema";

const toDomain = (row: MemoryFactRow): MemoryFact => ({
  id: row.id,
  category: row.category,
  content: row.content,
  confidence: row.confidence,
  source: row.source,
  status: row.status,
  sourcePostIds: row.sourcePostIds ?? [],
  createdAt: row.createdAt,
});

export function createMemoryRepository(db: Database): MemoryRepository {
  return {
    async listForUser(userId, status) {
      const rows = await db
        .select()
        .from(memoryFacts)
        .where(and(eq(memoryFacts.userId, userId), eq(memoryFacts.status, status)))
        .orderBy(desc(memoryFacts.confidence), desc(memoryFacts.createdAt));
      return rows.map(toDomain);
    },

    async countActive(userId) {
      const rows = await db
        .select({ value: count() })
        .from(memoryFacts)
        .where(and(eq(memoryFacts.userId, userId), eq(memoryFacts.status, "active")));
      return rows[0]?.value ?? 0;
    },

    async addFacts(userId, facts) {
      if (facts.length === 0) return [];

      const inserted = await db
        .insert(memoryFacts)
        .values(
          facts.map((fact) => ({
            userId,
            category: fact.category,
            content: fact.content,
            confidence: fact.confidence,
            source: fact.source,
            sourcePostIds: fact.sourcePostIds ?? null,
          })),
        )
        .returning();

      return inserted.map(toDomain);
    },

    async updateFact(factId, patch) {
      const updated = await db
        .update(memoryFacts)
        .set({
          ...(patch.content ? { content: patch.content } : {}),
          ...(patch.category ? { category: patch.category } : {}),
        })
        .where(eq(memoryFacts.id, factId))
        .returning();

      const row = updated[0];
      return row ? toDomain(row) : null;
    },

    async setStatus(factId, status) {
      await db.update(memoryFacts).set({ status }).where(eq(memoryFacts.id, factId));
    },

    async findOwner(factId) {
      const rows = await db
        .select({ userId: memoryFacts.userId })
        .from(memoryFacts)
        .where(eq(memoryFacts.id, factId))
        .limit(1);
      return rows[0]?.userId ?? null;
    },
  };
}
