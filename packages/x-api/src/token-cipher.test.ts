import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { pkceGenerator } from "./pkce";
import { createAesGcmTokenCipher } from "./token-cipher";

describe("createAesGcmTokenCipher", () => {
  const cipher = createAesGcmTokenCipher(randomBytes(32).toString("base64"));

  it("round-trips a token", () => {
    const token = "very-secret-access-token";
    expect(cipher.decrypt(cipher.encrypt(token))).toBe(token);
  });

  it("produces a different ciphertext per call", () => {
    const a = cipher.encrypt("same");
    const b = cipher.encrypt("same");
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });

  it("rejects tampered ciphertext", () => {
    const data = cipher.encrypt("token");
    const lastIndex = data.length - 1;
    data[lastIndex] = (data[lastIndex] ?? 0) ^ 0xff;
    expect(() => cipher.decrypt(data)).toThrow();
  });

  it("rejects keys of the wrong length", () => {
    expect(() => createAesGcmTokenCipher("dG9vLXNob3J0")).toThrow();
  });
});

describe("pkceGenerator", () => {
  it("generates verifier and challenge of expected shape", () => {
    const pair = pkceGenerator.generatePair();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.challenge).not.toBe(pair.verifier);
  });
});
