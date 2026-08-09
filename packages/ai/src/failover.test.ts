import type { AIFailure, AIProvider } from "@tweetbrainam/core";
import { err, ok } from "@tweetbrainam/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFailoverProvider } from "./failover";

const schema = z.object({ value: z.string() });

const input = {
  purpose: "voice_analysis" as const,
  system: "system",
  prompt: "prompt",
  schema,
};

function stubProvider(name: string, outcome: AIFailure | "success", calls: string[]): AIProvider {
  return {
    name,
    generateObject: async () => {
      calls.push(name);
      if (outcome === "success") {
        return ok({
          value: { value: name },
          usage: {
            provider: name,
            model: "test",
            inputTokens: 1,
            outputTokens: 1,
            latencyMs: 1,
          },
        });
      }
      return err(outcome);
    },
  } as AIProvider;
}

describe("createFailoverProvider", () => {
  it("returns the first successful provider's output", async () => {
    const calls: string[] = [];
    const provider = createFailoverProvider([
      stubProvider("a", "success", calls),
      stubProvider("b", "success", calls),
    ]);

    const result = await provider.generateObject(input);

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["a"]);
  });

  it("falls through when a provider is unavailable", async () => {
    const calls: string[] = [];
    const provider = createFailoverProvider([
      stubProvider("a", { kind: "unavailable", detail: "down" }, calls),
      stubProvider("b", "success", calls),
    ]);

    const result = await provider.generateObject(input);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toEqual({ value: "b" });
    expect(calls).toEqual(["a", "b"]);
  });

  it("falls through on rate limits", async () => {
    const calls: string[] = [];
    const provider = createFailoverProvider([
      stubProvider("a", { kind: "rate_limited", detail: "slow down" }, calls),
      stubProvider("b", "success", calls),
    ]);

    await provider.generateObject(input);
    expect(calls).toEqual(["a", "b"]);
  });

  it("stops immediately on invalid output rather than burning the next provider", async () => {
    const calls: string[] = [];
    const provider = createFailoverProvider([
      stubProvider("a", { kind: "invalid_output", detail: "bad json" }, calls),
      stubProvider("b", "success", calls),
    ]);

    const result = await provider.generateObject(input);

    expect(result.ok).toBe(false);
    expect(calls).toEqual(["a"]);
  });

  it("reports the last failure when every provider fails", async () => {
    const calls: string[] = [];
    const provider = createFailoverProvider([
      stubProvider("a", { kind: "unavailable", detail: "first" }, calls),
      stubProvider("b", { kind: "rate_limited", detail: "second" }, calls),
    ]);

    const result = await provider.generateObject(input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.detail).toBe("second");
  });

  it("refuses to build with no providers", () => {
    expect(() => createFailoverProvider([])).toThrow();
  });
});
