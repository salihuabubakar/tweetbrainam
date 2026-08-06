import type { EncryptedTokenSet, IdentityRepository, User } from "@tweetbrainam/core";
import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { type UserRow, users, xAccounts } from "../schema";

const toDomainUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  timezone: row.timezone,
  onboardingStep: row.onboardingStep,
});

const toBuffers = (tokens: EncryptedTokenSet) => ({
  accessTokenEnc: Buffer.from(tokens.accessTokenEnc),
  refreshTokenEnc: Buffer.from(tokens.refreshTokenEnc),
  tokenExpiresAt: tokens.tokenExpiresAt,
});

export function createIdentityRepository(db: Database): IdentityRepository {
  return {
    async findUserByXUserId(xUserId) {
      const rows = await db
        .select({ user: users })
        .from(xAccounts)
        .innerJoin(users, eq(xAccounts.userId, users.id))
        .where(eq(xAccounts.xUserId, xUserId))
        .limit(1);
      const row = rows[0];
      return row ? toDomainUser(row.user) : null;
    },

    async findUserById(userId) {
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const row = rows[0];
      return row ? toDomainUser(row) : null;
    },

    async createUserWithXAccount({ profile, tokens, scopes }) {
      return db.transaction(async (tx) => {
        const inserted = await tx
          .insert(users)
          .values({ name: profile.displayName, email: null })
          .returning();
        const user = inserted[0];
        if (!user) throw new Error("User insert returned no row.");

        await tx.insert(xAccounts).values({
          userId: user.id,
          xUserId: profile.xUserId,
          handle: profile.handle,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          scopes,
          isPrimary: true,
          ...toBuffers(tokens),
        });

        return toDomainUser(user);
      });
    },

    async updateXAccountTokens(xUserId, tokens) {
      await db
        .update(xAccounts)
        .set({ ...toBuffers(tokens), connectionStatus: "connected" })
        .where(eq(xAccounts.xUserId, xUserId));
    },
  };
}
