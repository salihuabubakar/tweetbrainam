import {
  type IngestablePost,
  type IngestedPostType,
  type XContentClient,
  err,
  ok,
} from "@tweetbrainam/core";
import { z } from "zod";

const API_BASE = "https://api.x.com/2";
// X rejects max_results outside 5..100 with a 400, so asking for the exact
// remainder breaks whenever fewer than five posts are left to collect.
// Overfetching is safe: the caller slices back down to maxPosts.
const MIN_RESULTS_PER_PAGE = 5;
const MAX_RESULTS_PER_PAGE = 100;

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string(),
  referenced_tweets: z
    .array(z.object({ type: z.enum(["retweeted", "quoted", "replied_to"]) }))
    .optional(),
  public_metrics: z
    .object({
      like_count: z.number(),
      reply_count: z.number(),
      retweet_count: z.number(),
      impression_count: z.number().optional(),
    })
    .optional(),
});

const timelineResponseSchema = z.object({
  data: z.array(tweetSchema).optional(),
  meta: z.object({ next_token: z.string().optional() }).optional(),
});

type Tweet = z.infer<typeof tweetSchema>;

const toPostType = (tweet: Tweet): IngestedPostType => {
  const reference = tweet.referenced_tweets?.[0]?.type;
  if (reference === "replied_to") return "reply";
  if (reference === "quoted") return "quote";
  return "post";
};

const toIngestablePost = (tweet: Tweet): IngestablePost => ({
  xPostId: tweet.id,
  type: toPostType(tweet),
  source: "x_api",
  text: tweet.text,
  postedAt: new Date(tweet.created_at),
  metrics: {
    likes: tweet.public_metrics?.like_count ?? 0,
    replies: tweet.public_metrics?.reply_count ?? 0,
    reposts: tweet.public_metrics?.retweet_count ?? 0,
    impressions: tweet.public_metrics?.impression_count ?? null,
  },
});

export function createXContentClient(): XContentClient {
  return {
    async fetchRecentPosts({ accessToken, xUserId, maxPosts, sincePostId }) {
      const collected: IngestablePost[] = [];
      let paginationToken: string | undefined;

      while (collected.length < maxPosts) {
        const url = new URL(`${API_BASE}/users/${xUserId}/tweets`);
        const remaining = maxPosts - collected.length;
        url.searchParams.set(
          "max_results",
          String(Math.min(MAX_RESULTS_PER_PAGE, Math.max(MIN_RESULTS_PER_PAGE, remaining))),
        );
        url.searchParams.set("tweet.fields", "created_at,public_metrics,referenced_tweets");
        url.searchParams.set("exclude", "retweets");
        if (sincePostId) url.searchParams.set("since_id", sincePostId);
        if (paginationToken) url.searchParams.set("pagination_token", paginationToken);

        const response = await fetch(url, {
          headers: { authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
          return err({
            status: response.status,
            detail: `X API ${response.status} from ${url.pathname}: ${await response.text()}`,
          });
        }

        const parsed = timelineResponseSchema.parse(await response.json());
        const tweets = parsed.data ?? [];
        collected.push(...tweets.map(toIngestablePost));

        paginationToken = parsed.meta?.next_token;
        if (!paginationToken || tweets.length === 0) break;
      }

      return ok(collected.slice(0, maxPosts));
    },
  };
}
