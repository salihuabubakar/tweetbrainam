import type { DraftSegment } from "../domain/drafting";
import type { PublishFailureReason } from "../domain/publishing";
import type { Result } from "../lib/result";

export type PublishInput = {
  accessToken: string;
  segments: DraftSegment[];
};

export type PublishFailure = {
  reason: PublishFailureReason;
  detail: string;
  publishedIdsBeforeFailure: string[];
};

export type XPublishClient = {
  publishThread(input: PublishInput): Promise<Result<{ xPostIds: string[] }, PublishFailure>>;
};
