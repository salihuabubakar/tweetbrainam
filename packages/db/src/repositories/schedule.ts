import type {
  ScheduleRepository,
  ScheduledPost,
  ScheduledPostWithContent,
} from "@tweetbrainam/core";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { Database } from "../client";
import { type ScheduledPostRow, draftVersions, drafts, planSlots, scheduledPosts } from "../schema";

const toDomain = (row: ScheduledPostRow): ScheduledPost => ({
  id: row.id,
  draftId: row.draftId,
  publishAt: row.publishAt,
  status: row.status,
  xPostIds: row.xPostIds ?? [],
  failureReason: row.failureReason,
  triggerRunId: row.triggerRunId,
});

export function createScheduleRepository(db: Database): ScheduleRepository {
  async function hydrate(row: ScheduledPostRow): Promise<ScheduledPostWithContent> {
    const draftRows = await db
      .select({ planSlotId: drafts.planSlotId })
      .from(drafts)
      .where(eq(drafts.id, row.draftId))
      .limit(1);

    const versionRows = await db
      .select({ segments: draftVersions.segments })
      .from(draftVersions)
      .where(eq(draftVersions.draftId, row.draftId))
      .orderBy(desc(draftVersions.version))
      .limit(1);

    const planSlotId = draftRows[0]?.planSlotId ?? null;
    const slotRows = planSlotId
      ? await db
          .select({ topic: planSlots.topic })
          .from(planSlots)
          .where(eq(planSlots.id, planSlotId))
          .limit(1)
      : [];

    return {
      ...toDomain(row),
      xAccountId: row.xAccountId,
      planSlotId,
      topic: slotRows[0]?.topic ?? null,
      segments: versionRows[0]?.segments ?? [],
    };
  }

  return {
    async schedule({ draftId, xAccountId, publishAt }) {
      const inserted = await db
        .insert(scheduledPosts)
        .values({ draftId, xAccountId, publishAt })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("Scheduled post insert returned no row.");
      return toDomain(row);
    },

    async findById(scheduledPostId) {
      const rows = await db
        .select()
        .from(scheduledPosts)
        .where(eq(scheduledPosts.id, scheduledPostId))
        .limit(1);
      const row = rows[0];
      return row ? hydrate(row) : null;
    },

    async findByDraft(draftId) {
      const rows = await db
        .select()
        .from(scheduledPosts)
        .where(eq(scheduledPosts.draftId, draftId))
        .limit(1);
      const row = rows[0];
      return row ? toDomain(row) : null;
    },

    async listForAccount(xAccountId, from, to) {
      const rows = await db
        .select()
        .from(scheduledPosts)
        .where(
          and(
            eq(scheduledPosts.xAccountId, xAccountId),
            gte(scheduledPosts.publishAt, from),
            lte(scheduledPosts.publishAt, to),
          ),
        )
        .orderBy(asc(scheduledPosts.publishAt));
      return Promise.all(rows.map(hydrate));
    },

    async setStatus(scheduledPostId, status, detail) {
      await db
        .update(scheduledPosts)
        .set({
          status,
          ...(detail?.xPostIds ? { xPostIds: detail.xPostIds } : {}),
          ...(detail?.publishedAt ? { publishedAt: detail.publishedAt } : {}),
          failureReason: detail?.failureReason ?? null,
        })
        .where(eq(scheduledPosts.id, scheduledPostId));
    },

    async setPublishAt(scheduledPostId, publishAt) {
      await db
        .update(scheduledPosts)
        .set({ publishAt })
        .where(eq(scheduledPosts.id, scheduledPostId));
    },

    async setTriggerRunId(scheduledPostId, triggerRunId) {
      await db
        .update(scheduledPosts)
        .set({ triggerRunId })
        .where(eq(scheduledPosts.id, scheduledPostId));
    },

    async claimForPublishing(scheduledPostId) {
      const claimed = await db
        .update(scheduledPosts)
        .set({ status: "publishing" })
        .where(and(eq(scheduledPosts.id, scheduledPostId), eq(scheduledPosts.status, "scheduled")))
        .returning({ id: scheduledPosts.id });
      return claimed.length > 0;
    },
  };
}
