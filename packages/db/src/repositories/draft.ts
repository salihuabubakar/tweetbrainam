import type { Draft, DraftRepository } from "@tweetbrainam/core";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import {
  type DraftRow,
  type DraftVersionRow,
  draftVersions,
  drafts,
  learningSignals,
  planSlots,
} from "../schema";

const toDomainDraft = (row: DraftRow, version: DraftVersionRow | undefined): Draft => ({
  id: row.id,
  planSlotId: row.planSlotId,
  status: row.status,
  currentVersion: version
    ? {
        id: version.id,
        version: version.version,
        segments: version.segments,
        author: version.author,
        createdAt: version.createdAt,
      }
    : null,
});

export function createDraftRepository(db: Database): DraftRepository {
  async function latestVersion(draftId: string): Promise<DraftVersionRow | undefined> {
    const rows = await db
      .select()
      .from(draftVersions)
      .where(eq(draftVersions.draftId, draftId))
      .orderBy(desc(draftVersions.version))
      .limit(1);
    return rows[0];
  }

  async function hydrate(row: DraftRow): Promise<Draft> {
    return toDomainDraft(row, await latestVersion(row.id));
  }

  return {
    async findById(draftId) {
      const rows = await db.select().from(drafts).where(eq(drafts.id, draftId)).limit(1);
      const row = rows[0];
      return row ? hydrate(row) : null;
    },

    async listForAccount(xAccountId, status) {
      const rows = await db
        .select({ draft: drafts, topic: planSlots.topic, targetAt: planSlots.targetAt })
        .from(drafts)
        .leftJoin(planSlots, eq(drafts.planSlotId, planSlots.id))
        .where(and(eq(drafts.xAccountId, xAccountId), eq(drafts.status, status)))
        .orderBy(desc(drafts.updatedAt));

      return Promise.all(
        rows.map(async (row) => ({
          ...(await hydrate(row.draft)),
          topic: row.topic,
          targetAt: row.targetAt,
          updatedAt: row.draft.updatedAt,
        })),
      );
    },

    async findBySlot(planSlotId) {
      const rows = await db
        .select()
        .from(drafts)
        .where(eq(drafts.planSlotId, planSlotId))
        .orderBy(desc(drafts.createdAt))
        .limit(1);
      const row = rows[0];
      return row ? hydrate(row) : null;
    },

    async createGenerating(xAccountId, planSlotId) {
      const inserted = await db
        .insert(drafts)
        .values({ xAccountId, planSlotId, status: "generating" })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("Draft insert returned no row.");
      return toDomainDraft(row, undefined);
    },

    async addVersion(draftId, segments, author) {
      return db.transaction(async (tx) => {
        const previous = await tx
          .select({ version: draftVersions.version })
          .from(draftVersions)
          .where(eq(draftVersions.draftId, draftId))
          .orderBy(desc(draftVersions.version))
          .limit(1);

        const inserted = await tx
          .insert(draftVersions)
          .values({
            draftId,
            version: (previous[0]?.version ?? 0) + 1,
            segments,
            author,
          })
          .returning();

        const rows = await tx.select().from(drafts).where(eq(drafts.id, draftId)).limit(1);
        const draftRow = rows[0];
        if (!draftRow) throw new Error("Draft not found when adding a version.");

        return toDomainDraft(draftRow, inserted[0]);
      });
    },

    async setStatus(draftId, status) {
      await db.update(drafts).set({ status }).where(eq(drafts.id, draftId));
    },

    async recordLearningSignal(input) {
      await db.insert(learningSignals).values({
        xAccountId: input.xAccountId,
        draftId: input.draftId,
        type: input.type,
        payload: input.payload,
      });
    },

    async findAccountIdForDraft(draftId) {
      const rows = await db
        .select({ xAccountId: drafts.xAccountId })
        .from(drafts)
        .where(eq(drafts.id, draftId))
        .limit(1);
      return rows[0]?.xAccountId ?? null;
    },
  };
}
