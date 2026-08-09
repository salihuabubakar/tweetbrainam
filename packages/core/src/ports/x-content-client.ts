import type { IngestablePost } from "../domain/ingestion";
import type { Result } from "../lib/result";

export type FetchRecentPostsInput = {
  accessToken: string;
  xUserId: string;
  maxPosts: number;
  sincePostId: string | null;
};

export type FetchFailure = {
  status: number;
  detail: string;
};

export type XContentClient = {
  fetchRecentPosts(input: FetchRecentPostsInput): Promise<Result<IngestablePost[], FetchFailure>>;
};
