import type { EncryptedTokenSet } from "../domain/identity";

export type XTokenRepository = {
  findTokens(xAccountId: string): Promise<EncryptedTokenSet | null>;
  saveTokens(xAccountId: string, tokens: EncryptedTokenSet): Promise<void>;
  markDisconnected(xAccountId: string): Promise<void>;
};

// Hands out a usable access token, refreshing behind the scenes when the stored
// one is spent. Returns null only when the connection genuinely needs a human.
export type XTokenProvider = {
  accessTokenFor(xAccountId: string): Promise<string | null>;
};
