import type { Result } from "../lib/result";
import type { AIFailure } from "./ai-provider";

export const embeddingPurposes = ["document", "query"] as const;

export type EmbeddingPurpose = (typeof embeddingPurposes)[number];

export const MAX_EMBEDDING_BATCH = 96;

export type EmbeddingProvider = {
  readonly id: string;
  readonly dimensions: number;
  embed(texts: string[], purpose: EmbeddingPurpose): Promise<Result<number[][], AIFailure>>;
};
