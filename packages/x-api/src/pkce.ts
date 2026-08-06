import { createHash, randomBytes } from "node:crypto";
import type { PkceGenerator, PkcePair } from "@tweetbrainam/core";

const base64Url = (buffer: Buffer) => buffer.toString("base64url");

export const pkceGenerator: PkceGenerator = {
  generatePair(): PkcePair {
    const verifier = base64Url(randomBytes(32));
    const challenge = base64Url(createHash("sha256").update(verifier).digest());
    return { verifier, challenge };
  },
  generateState(): string {
    return base64Url(randomBytes(24));
  },
};
