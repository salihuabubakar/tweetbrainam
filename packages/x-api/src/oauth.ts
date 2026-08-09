import { type XOAuthClient, type XProfile, type XTokenSet, X_SCOPES } from "@tweetbrainam/core";
import { z } from "zod";
import { XApiError } from "./errors";

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const ME_URL = "https://api.x.com/2/users/me";
const REVOKE_URL = "https://api.x.com/2/oauth2/revoke";

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

const meResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string(),
    profile_image_url: z.string().optional(),
  }),
});

export type XOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function createXOAuthClient(config: XOAuthConfig): XOAuthClient {
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  async function requestTokens(body: URLSearchParams): Promise<XTokenSet> {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        authorization: `Basic ${basicAuth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) {
      throw new XApiError(response.status, TOKEN_URL, await response.text());
    }
    const parsed = tokenResponseSchema.parse(await response.json());
    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      expiresInSeconds: parsed.expires_in,
    };
  }

  return {
    buildAuthorizationUrl(state, codeChallenge) {
      const url = new URL(AUTHORIZE_URL);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", config.redirectUri);
      url.searchParams.set("scope", X_SCOPES.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      return url.toString();
    },

    exchangeCode(code, codeVerifier) {
      return requestTokens(
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          code_verifier: codeVerifier,
          client_id: config.clientId,
        }),
      );
    },

    refreshTokens(refreshToken) {
      return requestTokens(
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: config.clientId,
        }),
      );
    },

    async fetchProfile(accessToken): Promise<XProfile> {
      const url = `${ME_URL}?user.fields=profile_image_url`;
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new XApiError(response.status, ME_URL, await response.text());
      }
      const parsed = meResponseSchema.parse(await response.json());
      return {
        xUserId: parsed.data.id,
        handle: parsed.data.username,
        displayName: parsed.data.name,
        avatarUrl: parsed.data.profile_image_url ?? null,
      };
    },

    async revokeToken(token) {
      const response = await fetch(REVOKE_URL, {
        method: "POST",
        headers: {
          authorization: `Basic ${basicAuth}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token,
          token_type_hint: "access_token",
          client_id: config.clientId,
        }),
      });
      if (!response.ok) {
        throw new XApiError(response.status, REVOKE_URL, await response.text());
      }
    },
  };
}
