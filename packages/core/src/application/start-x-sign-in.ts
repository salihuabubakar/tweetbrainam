import type { PkceGenerator } from "../ports/security";
import type { OAuthStateStore } from "../ports/sessions";
import type { XOAuthClient } from "../ports/x-oauth-client";

const STATE_TTL_SECONDS = 600;

export type StartXSignInDeps = {
  pkce: PkceGenerator;
  states: OAuthStateStore;
  xOAuth: XOAuthClient;
};

export async function startXSignIn(deps: StartXSignInDeps): Promise<{ authorizationUrl: string }> {
  const pair = deps.pkce.generatePair();
  const state = deps.pkce.generateState();
  await deps.states.save(state, pair.verifier, STATE_TTL_SECONDS);
  return { authorizationUrl: deps.xOAuth.buildAuthorizationUrl(state, pair.challenge) };
}
