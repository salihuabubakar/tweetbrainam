import { type DomainError, domainError } from "../domain/errors";
import type { OnboardingStep } from "../domain/identity";
import { type Result, err, ok } from "../lib/result";
import type { Clock } from "../ports/clock";
import type { IdentityRepository } from "../ports/identity-repository";
import type { TokenCipher } from "../ports/security";
import type { OAuthStateStore, SessionStore } from "../ports/sessions";
import type { XOAuthClient, XTokenSet } from "../ports/x-oauth-client";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export const X_SCOPES = ["users.read", "tweet.read", "tweet.write", "offline.access"];

export type CompleteXSignInDeps = {
  states: OAuthStateStore;
  xOAuth: XOAuthClient;
  cipher: TokenCipher;
  identity: IdentityRepository;
  sessions: SessionStore;
  clock: Clock;
};

export type CompleteXSignInInput = {
  code: string;
  state: string;
};

export type CompleteXSignInOutput = {
  sessionId: string;
  isNewUser: boolean;
  onboardingStep: OnboardingStep;
};

export async function completeXSignIn(
  deps: CompleteXSignInDeps,
  input: CompleteXSignInInput,
): Promise<Result<CompleteXSignInOutput, DomainError>> {
  const codeVerifier = await deps.states.consume(input.state);
  if (codeVerifier === null) {
    return err(domainError("oauth_state_invalid", "Sign-in expired or was tampered with."));
  }

  let tokens: XTokenSet;
  try {
    tokens = await deps.xOAuth.exchangeCode(input.code, codeVerifier);
  } catch {
    return err(domainError("oauth_exchange_failed", "Could not complete sign-in with X."));
  }

  const profile = await deps.xOAuth.fetchProfile(tokens.accessToken);
  const encryptedTokens = {
    accessTokenEnc: deps.cipher.encrypt(tokens.accessToken),
    refreshTokenEnc: deps.cipher.encrypt(tokens.refreshToken),
    tokenExpiresAt: new Date(deps.clock.now().getTime() + tokens.expiresInSeconds * 1000),
  };

  const existingUser = await deps.identity.findUserByXUserId(profile.xUserId);
  const user =
    existingUser ??
    (await deps.identity.createUserWithXAccount({
      profile,
      tokens: encryptedTokens,
      scopes: X_SCOPES,
    }));

  if (existingUser) {
    await deps.identity.updateXAccountTokens(profile.xUserId, encryptedTokens);
  }

  const sessionId = await deps.sessions.create(user.id, SESSION_TTL_SECONDS);

  return ok({
    sessionId,
    isNewUser: existingUser === null,
    onboardingStep: user.onboardingStep,
  });
}
