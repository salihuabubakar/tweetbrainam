import { type DomainError, domainError } from "../domain/errors";
import { type Result, err, ok } from "../lib/result";
import type { IdentityRepository } from "../ports/identity-repository";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { TokenCipher } from "../ports/security";
import type { XOAuthClient } from "../ports/x-oauth-client";

export type DeleteAccountDeps = {
  identity: IdentityRepository;
  ingestion: IngestionRepository;
  cipher: TokenCipher;
  xOAuth: XOAuthClient;
};

export type DeleteAccountOutput = {
  tokenRevoked: boolean;
};

export async function deleteAccount(
  deps: DeleteAccountDeps,
  input: { userId: string },
): Promise<Result<DeleteAccountOutput, DomainError>> {
  const user = await deps.identity.findUserById(input.userId);
  if (!user) return err(domainError("user_not_found", "Account not found."));

  const account = await deps.ingestion.findAccountByUserId(user.id);
  let tokenRevoked = false;

  if (account) {
    try {
      await deps.xOAuth.revokeToken(deps.cipher.decrypt(account.accessTokenEnc));
      tokenRevoked = true;
    } catch {
      tokenRevoked = false;
    }
  }

  await deps.identity.deleteUser(user.id);
  return ok({ tokenRevoked });
}
