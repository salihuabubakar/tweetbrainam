import { errorEnvelopeSchema } from "@tweetbrainam/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("app", () => {
  const app = createApp();

  it("serves healthz", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("returns a typed error envelope for unknown routes", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
    expect(body.error.requestId).not.toHaveLength(0);
  });
});
