import { afterEach, describe, expect, it, vi } from "vitest";
import { createXContentClient } from "./timeline";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stubFetch(pages: { id: string; text: string }[][]) {
  const requested: URL[] = [];
  let call = 0;

  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    requested.push(new URL(input.toString()));
    const page = pages[call] ?? [];
    call += 1;

    return new Response(
      JSON.stringify({
        data: page.map((tweet) => ({
          ...tweet,
          created_at: "2026-08-01T00:00:00.000Z",
          public_metrics: {
            like_count: 0,
            reply_count: 0,
            retweet_count: 0,
          },
        })),
        meta: call < pages.length ? { next_token: `page-${call}` } : {},
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  return { requested };
}

const post = (id: string) => ({ id, text: `Post ${id}` });

describe("fetchRecentPosts", () => {
  it("never asks X for fewer than five results", async () => {
    const { requested } = stubFetch([[post("1"), post("2")]]);

    await createXContentClient().fetchRecentPosts({
      accessToken: "token",
      xUserId: "u1",
      maxPosts: 2,
      sincePostId: null,
    });

    expect(requested[0]?.searchParams.get("max_results")).toBe("5");
  });

  it("clamps the final page rather than requesting the exact remainder", async () => {
    const firstPage = Array.from({ length: 8 }, (_, index) => post(String(index + 1)));
    const { requested } = stubFetch([firstPage, [post("9")]]);

    await createXContentClient().fetchRecentPosts({
      accessToken: "token",
      xUserId: "u1",
      maxPosts: 10,
      sincePostId: null,
    });

    expect(requested[1]?.searchParams.get("max_results")).toBe("5");
  });

  it("still returns no more than the caller asked for", async () => {
    stubFetch([[post("1"), post("2"), post("3"), post("4"), post("5")]]);

    const result = await createXContentClient().fetchRecentPosts({
      accessToken: "token",
      xUserId: "u1",
      maxPosts: 2,
      sincePostId: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(2);
  });
});
