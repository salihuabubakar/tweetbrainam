export const ingestedPostTypes = ["post", "reply", "quote"] as const;

export type IngestedPostType = (typeof ingestedPostTypes)[number];

export type PostMetrics = {
  likes: number;
  replies: number;
  reposts: number;
  impressions: number | null;
};

export const postSources = ["x_api", "manual"] as const;

export type PostSource = (typeof postSources)[number];

export type IngestablePost = {
  xPostId: string;
  type: IngestedPostType;
  text: string;
  postedAt: Date | null;
  metrics: PostMetrics | null;
  source: PostSource;
};

export type IngestionSummary = {
  fetched: number;
  stored: number;
  newestPostId: string | null;
};

export const MIN_POSTS_FOR_VOICE_PROFILE = 25;

export const analysisStates = ["idle", "running", "complete", "failed"] as const;

export type AnalysisState = (typeof analysisStates)[number];

export const analysisFailureReasons = [
  "access_denied",
  "rate_limited",
  "connection_revoked",
  "unknown",
] as const;

export type AnalysisFailureReason = (typeof analysisFailureReasons)[number];

export const analysisFailureMessages: Record<AnalysisFailureReason, string> = {
  access_denied:
    "We couldn't read your posts — our access to the X API is limited right now. This is on our side, not yours.",
  rate_limited: "X asked us to slow down. We'll retry automatically in a few minutes.",
  connection_revoked: "Your X connection expired. Reconnect your account to continue.",
  unknown: "Something went wrong while reading your posts. You can try again.",
};

export const isUsableForVoiceProfile = (post: IngestablePost): boolean =>
  post.text.trim().length >= 40 && !post.text.trim().startsWith("RT @");
