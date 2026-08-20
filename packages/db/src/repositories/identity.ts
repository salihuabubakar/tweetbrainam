import type { EncryptedTokenSet, IdentityRepository, User } from "@tweetbrainam/core";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../client";
import { type UserRow, users, xAccounts } from "../schema";

const toDomainUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  timezone: row.timezone,
  onboardingStep: row.onboardingStep,
  preferences: row.preferences ?? null,
  hasSeenTour: row.tourCompletedAt !== null,
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

    async listActiveOnboardedUsers() {
      return db
        .select({ id: users.id, timezone: users.timezone })
        .from(users)
        .where(and(eq(users.status, "active"), eq(users.onboardingStep, "done")));
    },

    async recordConsent(userId, at) {
      await db.update(users).set({ consentedAt: at }).where(eq(users.id, userId));
    },

    async recordTourCompleted(userId, at) {
      await db.update(users).set({ tourCompletedAt: at }).where(eq(users.id, userId));
    },

    async updateOnboardingStep(userId, step) {
      await db.update(users).set({ onboardingStep: step }).where(eq(users.id, userId));
    },

    async saveUserGoals(userId, goals) {
      await db
        .update(users)
        .set({
          timezone: goals.timezone,
          preferences: { goal: goals.goal, postsPerWeek: goals.postsPerWeek, postingWindows: [] },
        })
        .where(eq(users.id, userId));
    },

    async findXAccountSummary(userId) {
      const rows = await db
        .select({
          handle: xAccounts.handle,
          displayName: xAccounts.displayName,
          avatarUrl: xAccounts.avatarUrl,
          connectionStatus: xAccounts.connectionStatus,
          connectedAt: xAccounts.createdAt,
        })
        .from(xAccounts)
        .where(eq(xAccounts.userId, userId))
        .orderBy(desc(xAccounts.isPrimary))
        .limit(1);
      return rows[0] ?? null;
    },

    async savePreferences(userId, { timezone, preferences }) {
      await db.update(users).set({ timezone, preferences }).where(eq(users.id, userId));
    },

    async deleteUser(userId) {
      await db.delete(users).where(eq(users.id, userId));
    },
  };
}
