import type { AnalysisFailureReason, AnalysisState, IngestablePost } from "../domain/ingestion";

export type IngestionAccount = {
  id: string;
  xUserId: string;
  accessTokenEnc: Uint8Array;
  lastIngestedPostId: string | null;
  analysisState: AnalysisState;
  analysisFailureReason: AnalysisFailureReason | null;
};

export type ExamplePost = {
  id: string;
  text: string;
  likes: number | null;
  postedAt: Date | null;
};

export type IngestionRepository = {
  findAccountByUserId(userId: string): Promise<IngestionAccount | null>;
  listPostsMissingEmbedding(
    xAccountId: string,
    limit: number,
  ): Promise<{ id: string; text: string }[]>;
  saveEmbeddings(entries: { id: string; embedding: number[] }[]): Promise<void>;
  findSimilarPosts(xAccountId: string, embedding: number[], limit: number): Promise<ExamplePost[]>;
  findPostsMatchingTerms(
    xAccountId: string,
    terms: string[],
    limit: number,
  ): Promise<ExamplePost[]>;
  saveIngestedPosts(xAccountId: string, posts: IngestablePost[]): Promise<number>;
  updateIngestionWatermark(xAccountId: string, newestPostId: string): Promise<void>;
  countIngestedPosts(xAccountId: string): Promise<number>;
  findAccessTokenForAccount(xAccountId: string): Promise<Uint8Array | null>;
  setAnalysisState(
    xAccountId: string,
    state: AnalysisState,
    failureReason?: AnalysisFailureReason,
  ): Promise<void>;
};
