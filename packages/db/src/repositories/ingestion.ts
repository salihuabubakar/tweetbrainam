import type { IngestionRepository } from "@tweetbrainam/core";
import {
  and,
  asc,
  cosineDistance,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { Database } from "../client";
import { ingestedPosts, xAccounts } from "../schema";

export function createIngestionRepository(db: Database): IngestionRepository {
  return {
    async findAccountByUserId(userId) {
      const rows = await db
        .select({
          id: xAccounts.id,
          xUserId: xAccounts.xUserId,
          accessTokenEnc: xAccounts.accessTokenEnc,
          lastIngestedPostId: xAccounts.lastIngestedPostId,
          analysisState: xAccounts.analysisState,
          analysisFailureReason: xAccounts.analysisFailureReason,
        })
        .from(xAccounts)
        .where(and(eq(xAccounts.userId, userId), eq(xAccounts.isPrimary, true)))
        .limit(1);
      return rows[0] ?? null;
    },

    async saveIngestedPosts(xAccountId, posts) {
      if (posts.length === 0) return 0;

      const inserted = await db
        .insert(ingestedPosts)
        .values(
          posts.map((post) => ({
            xAccountId,
            xPostId: post.xPostId,
            type: post.type,
            source: post.source,
            text: post.text,
            postedAt: post.postedAt,
            metricsAtIngest: post.metrics,
            characterCount: post.text.length,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: ingestedPosts.id });

      return inserted.length;
    },

    async updateIngestionWatermark(xAccountId, newestPostId) {
      await db
        .update(xAccounts)
        .set({ lastIngestedPostId: newestPostId })
        .where(eq(xAccounts.id, xAccountId));
    },

    async findUserIdForAccount(xAccountId) {
      const rows = await db
        .select({ userId: xAccounts.userId })
        .from(xAccounts)
        .where(eq(xAccounts.id, xAccountId))
        .limit(1);
      return rows[0]?.userId ?? null;
    },

    async findAccessTokenForAccount(xAccountId) {
      const rows = await db
        .select({ accessTokenEnc: xAccounts.accessTokenEnc })
        .from(xAccounts)
        .where(eq(xAccounts.id, xAccountId))
        .limit(1);
      return rows[0]?.accessTokenEnc ?? null;
    },

    async setAnalysisState(xAccountId, state, failureReason) {
      await db
        .update(xAccounts)
        .set({
          analysisState: state,
          analysisFailureReason: failureReason ?? null,
          analysisUpdatedAt: new Date(),
        })
        .where(eq(xAccounts.id, xAccountId));
    },

    async listPostsMissingEmbedding(xAccountId, limit) {
      return db
        .select({ id: ingestedPosts.id, text: ingestedPosts.text })
        .from(ingestedPosts)
        .where(and(eq(ingestedPosts.xAccountId, xAccountId), isNull(ingestedPosts.embedding)))
        .orderBy(desc(ingestedPosts.createdAt))
        .limit(limit);
    },

    async saveEmbeddings(entries) {
      if (entries.length === 0) return;

      await db.transaction(async (tx) => {
        for (const entry of entries) {
          await tx
            .update(ingestedPosts)
            .set({ embedding: entry.embedding })
            .where(eq(ingestedPosts.id, entry.id));
        }
      });
    },

    async findSimilarPosts(xAccountId, embedding, limit) {
      const distance = cosineDistance(ingestedPosts.embedding, embedding);

      return db
        .select({
          id: ingestedPosts.id,
          text: ingestedPosts.text,
          likes: sql<number | null>`(${ingestedPosts.metricsAtIngest} ->> 'likes')::int`,
          postedAt: ingestedPosts.postedAt,
        })
        .from(ingestedPosts)
        .where(and(eq(ingestedPosts.xAccountId, xAccountId), isNotNull(ingestedPosts.embedding)))
        .orderBy(asc(distance))
        .limit(limit);
    },

    async findPostsMatchingTerms(xAccountId, terms, limit) {
      const selection = {
        id: ingestedPosts.id,
        text: ingestedPosts.text,
        likes: sql<number | null>`(${ingestedPosts.metricsAtIngest} ->> 'likes')::int`,
        postedAt: ingestedPosts.postedAt,
      };

      const matched =
        terms.length === 0
          ? []
          : await db
              .select(selection)
              .from(ingestedPosts)
              .where(
                and(
                  eq(ingestedPosts.xAccountId, xAccountId),
                  or(...terms.map((term) => ilike(ingestedPosts.text, `%${term}%`))),
                ),
              )
              .orderBy(desc(ingestedPosts.characterCount))
              .limit(limit);

      if (matched.length >= limit) return matched;

      const seen = new Set(matched.map((post) => post.id));
      const recent = await db
        .select(selection)
        .from(ingestedPosts)
        .where(eq(ingestedPosts.xAccountId, xAccountId))
        .orderBy(sql`${ingestedPosts.postedAt} desc nulls last`, desc(ingestedPosts.createdAt))
        .limit(limit * 2);

      return [...matched, ...recent.filter((post) => !seen.has(post.id))].slice(0, limit);
    },

    async countIngestedPosts(xAccountId) {
      const rows = await db
        .select({ value: count() })
        .from(ingestedPosts)
        .where(eq(ingestedPosts.xAccountId, xAccountId));
      return rows[0]?.value ?? 0;
    },
  };
}
