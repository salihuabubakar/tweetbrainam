import type { VoiceProfile, VoiceRepository } from "@tweetbrainam/core";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { Database } from "../client";
import { type VoiceProfileRow, ingestedPosts, voiceProfiles } from "../schema";

const toDomainProfile = (row: VoiceProfileRow): VoiceProfile => ({
  id: row.id,
  version: row.version,
  traits: row.traits,
  topics: row.topics,
  sampleSentences: row.sampleSentences,
  source: row.source,
  isActive: row.isActive,
  postsAnalyzed: row.postsAnalyzed,
  createdAt: row.createdAt,
});

export function createVoiceRepository(db: Database): VoiceRepository {
  return {
    async listSamplePosts(xAccountId, limit) {
      const rows = await db
        .select({ text: ingestedPosts.text })
        .from(ingestedPosts)
        .where(eq(ingestedPosts.xAccountId, xAccountId))
        .orderBy(desc(ingestedPosts.createdAt))
        .limit(limit);
      return rows.map((row) => row.text);
    },

    async listPostTimes(xAccountId, limit) {
      const rows = await db
        .select({ postedAt: ingestedPosts.postedAt })
        .from(ingestedPosts)
        .where(and(eq(ingestedPosts.xAccountId, xAccountId), isNotNull(ingestedPosts.postedAt)))
        .orderBy(desc(ingestedPosts.postedAt))
        .limit(limit);
      return rows.flatMap((row) => (row.postedAt ? [row.postedAt] : []));
    },

    async findActiveProfile(xAccountId) {
      const rows = await db
        .select()
        .from(voiceProfiles)
        .where(and(eq(voiceProfiles.xAccountId, xAccountId), eq(voiceProfiles.isActive, true)))
        .limit(1);
      const row = rows[0];
      return row ? toDomainProfile(row) : null;
    },

    async saveProfileAsActive(input) {
      return db.transaction(async (tx) => {
        const previous = await tx
          .select({ version: voiceProfiles.version })
          .from(voiceProfiles)
          .where(eq(voiceProfiles.xAccountId, input.xAccountId))
          .orderBy(desc(voiceProfiles.version))
          .limit(1);

        await tx
          .update(voiceProfiles)
          .set({ isActive: false })
          .where(
            and(
              eq(voiceProfiles.xAccountId, input.xAccountId),
              eq(voiceProfiles.isActive, true),
              isNotNull(voiceProfiles.id),
            ),
          );

        const inserted = await tx
          .insert(voiceProfiles)
          .values({
            xAccountId: input.xAccountId,
            version: (previous[0]?.version ?? 0) + 1,
            traits: input.traits,
            topics: input.topics,
            sampleSentences: input.sampleSentences,
            source: input.source,
            postsAnalyzed: input.postsAnalyzed,
            isActive: true,
          })
          .returning();

        const row = inserted[0];
        if (!row) throw new Error("Voice profile insert returned no row.");
        return toDomainProfile(row);
      });
    },
  };
}
