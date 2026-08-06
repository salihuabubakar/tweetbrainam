export {
  domainError,
  domainErrorCodes,
  type DomainError,
  type DomainErrorCode,
} from "./domain/errors";
export {
  onboardingSteps,
  type EncryptedTokenSet,
  type OnboardingStep,
  type User,
  type XProfile,
} from "./domain/identity";
export { err, ok, type Result } from "./lib/result";
export type { Clock } from "./ports/clock";
export type { IdentityRepository } from "./ports/identity-repository";
export type { PkceGenerator, PkcePair, TokenCipher } from "./ports/security";
export type { OAuthStateStore, SessionStore } from "./ports/sessions";
export type { XOAuthClient, XTokenSet } from "./ports/x-oauth-client";
export {
  completeXSignIn,
  X_SCOPES,
  type CompleteXSignInDeps,
  type CompleteXSignInInput,
  type CompleteXSignInOutput,
} from "./application/complete-x-sign-in";
export { startXSignIn, type StartXSignInDeps } from "./application/start-x-sign-in";
