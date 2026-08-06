export type TokenCipher = {
  encrypt(plaintext: string): Uint8Array;
  decrypt(ciphertext: Uint8Array): string;
};

export type PkcePair = {
  verifier: string;
  challenge: string;
};

export type PkceGenerator = {
  generatePair(): PkcePair;
  generateState(): string;
};
