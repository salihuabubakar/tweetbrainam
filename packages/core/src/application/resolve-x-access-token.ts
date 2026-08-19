import type { Clock } from "../ports/clock";
import type { TokenCipher } from "../ports/security";
import type { XOAuthClient } from "../ports/x-oauth-client";
import type { XTokenProvider, XTokenRepository } from "../ports/x-token-provider";

// X access tokens live two hours. Refreshing a minute early keeps a token from
// expiring midway through a request that has already passed the check.
const REFRESH_SKEW_MS = 60_000;

export type ResolveXAccessTokenDeps = {
  tokens: XTokenRepository;
  xOAuth: Pick<XOAuthClient, "refreshTokens">;
  cipher: TokenCipher;
  clock: Clock;
};

function isUsable(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() - now.getTime() > REFRESH_SKEW_MS;
}

export async function resolveXAccessToken(
  deps: ResolveXAccessTokenDeps,
  xAccountId: string,
): Promise<string | null> {
  const stored = await deps.tokens.findTokens(xAccountId);
  if (!stored) return null;

  const now = deps.clock.now();
  if (isUsable(stored.tokenExpiresAt, now)) {
    return deps.cipher.decrypt(stored.accessTokenEnc);
  }

  try {
    const refreshed = await deps.xOAuth.refreshTokens(deps.cipher.decrypt(stored.refreshTokenEnc));

    await deps.tokens.saveTokens(xAccountId, {
      accessTokenEnc: deps.cipher.encrypt(refreshed.accessToken),
      refreshTokenEnc: deps.cipher.encrypt(refreshed.refreshToken),
      tokenExpiresAt: new Date(deps.clock.now().getTime() + refreshed.expiresInSeconds * 1000),
    });

    return refreshed.accessToken;
  } catch {
    // X rotates the refresh token on every use, so two workers refreshing at
    // once means the loser presents a token that was just retired. Re-reading
    // tells us whether the winner already stored a good one.
    const current = await deps.tokens.findTokens(xAccountId);
    if (current && isUsable(current.tokenExpiresAt, deps.clock.now())) {
      return deps.cipher.decrypt(current.accessTokenEnc);
    }

    await deps.tokens.markDisconnected(xAccountId);
    return null;
  }
}

export function createXTokenProvider(deps: ResolveXAccessTokenDeps): XTokenProvider {
  return {
    accessTokenFor: (xAccountId) => resolveXAccessToken(deps, xAccountId),
  };
}
