import type { EncryptedTokenSet, XTokenRepository } from "@tweetbrainam/core";
import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { xAccounts } from "../schema";

export function createXTokenRepository(db: Database): XTokenRepository {
  return {
    async findTokens(xAccountId) {
      const rows = await db
        .select({
          accessTokenEnc: xAccounts.accessTokenEnc,
          refreshTokenEnc: xAccounts.refreshTokenEnc,
          tokenExpiresAt: xAccounts.tokenExpiresAt,
        })
        .from(xAccounts)
        .where(eq(xAccounts.id, xAccountId))
        .limit(1);

      return rows[0] ?? null;
    },

    async saveTokens(xAccountId, tokens: EncryptedTokenSet) {
      await db
        .update(xAccounts)
        .set({
          accessTokenEnc: Buffer.from(tokens.accessTokenEnc),
          refreshTokenEnc: Buffer.from(tokens.refreshTokenEnc),
          tokenExpiresAt: tokens.tokenExpiresAt,
          connectionStatus: "connected",
        })
        .where(eq(xAccounts.id, xAccountId));
    },

    async markDisconnected(xAccountId) {
      await db
        .update(xAccounts)
        .set({ connectionStatus: "token_expired" })
        .where(eq(xAccounts.id, xAccountId));
    },
  };
}
