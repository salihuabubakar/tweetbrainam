import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { TokenCipher } from "@tweetbrainam/core";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function createAesGcmTokenCipher(base64Key: string): TokenCipher {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  }

  return {
    encrypt(plaintext) {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return Buffer.concat([iv, encrypted, cipher.getAuthTag()]);
    },

    decrypt(ciphertext) {
      const buffer = Buffer.from(ciphertext);
      const iv = buffer.subarray(0, IV_LENGTH);
      const tag = buffer.subarray(buffer.length - TAG_LENGTH);
      const encrypted = buffer.subarray(IV_LENGTH, buffer.length - TAG_LENGTH);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    },
  };
}
