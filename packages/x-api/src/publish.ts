import { type PublishFailureReason, type XPublishClient, err, ok } from "@tweetbrainam/core";
import { z } from "zod";

const TWEETS_URL = "https://api.x.com/2/tweets";

const createTweetResponseSchema = z.object({
  data: z.object({ id: z.string() }),
});

function classify(status: number, body: string): PublishFailureReason {
  if (status === 401) return "connection_revoked";
  if (status === 429) return "rate_limited";
  if (status === 403 && body.includes("duplicate")) return "duplicate_content";
  if (status === 403) return "content_rejected";
  if (status >= 500) return "rate_limited";
  return "unknown";
}

export function createXPublishClient(): XPublishClient {
  return {
    async publishThread({ accessToken, segments }) {
      const published: string[] = [];

      for (const segment of segments) {
        const body: Record<string, unknown> = { text: segment.text };
        const replyTo = published.at(-1);
        if (replyTo) body.reply = { in_reply_to_tweet_id: replyTo };

        const response = await fetch(TWEETS_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const detail = await response.text();
          return err({
            reason: classify(response.status, detail),
            detail: `X API ${response.status}: ${detail}`,
            publishedIdsBeforeFailure: published,
          });
        }

        const parsed = createTweetResponseSchema.safeParse(await response.json());
        if (!parsed.success) {
          return err({
            reason: "unknown" as const,
            detail: "X returned an unexpected response shape.",
            publishedIdsBeforeFailure: published,
          });
        }

        published.push(parsed.data.data.id);
      }

      return ok({ xPostIds: published });
    },
  };
}
