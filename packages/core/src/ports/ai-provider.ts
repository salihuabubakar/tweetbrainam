import type { ZodType } from "zod";
import type { Result } from "../lib/result";

export const generationPurposes = [
  "voice_analysis",
  "memory_extraction",
  "plan",
  "draft",
  "refinement",
] as const;

export type GenerationPurpose = (typeof generationPurposes)[number];

export type GenerationUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export type AIFailure = {
  kind: "unavailable" | "rate_limited" | "invalid_output" | "unknown";
  detail: string;
};

export type GenerateObjectInput<T> = {
  purpose: GenerationPurpose;
  system: string;
  prompt: string;
  schema: ZodType<T>;
};

export type GenerateObjectOutput<T> = {
  value: T;
  usage: GenerationUsage;
};

export type AIProvider = {
  name: string;
  generateObject<T>(
    input: GenerateObjectInput<T>,
  ): Promise<Result<GenerateObjectOutput<T>, AIFailure>>;
};
