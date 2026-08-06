import type { EncryptedTokenSet, User, XProfile } from "../domain/identity";

export type IdentityRepository = {
  findUserByXUserId(xUserId: string): Promise<User | null>;
  findUserById(userId: string): Promise<User | null>;
  createUserWithXAccount(input: {
    profile: XProfile;
    tokens: EncryptedTokenSet;
    scopes: string[];
  }): Promise<User>;
  updateXAccountTokens(xUserId: string, tokens: EncryptedTokenSet): Promise<void>;
};
