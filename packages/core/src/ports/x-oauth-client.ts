import type { XProfile } from "../domain/identity";

export type XTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

export type XOAuthClient = {
  buildAuthorizationUrl(state: string, codeChallenge: string): string;
  exchangeCode(code: string, codeVerifier: string): Promise<XTokenSet>;
  refreshTokens(refreshToken: string): Promise<XTokenSet>;
  fetchProfile(accessToken: string): Promise<XProfile>;
  revokeToken(token: string): Promise<void>;
};
