import { parseEnv } from "@tweetbrainam/config";
import { z } from "zod";

export const env = parseEnv({
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://tweetbrainam:tweetbrainam@localhost:5433/tweetbrainam"),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
  INGESTION_MAX_POSTS: z.coerce.number().int().min(1).max(3200).default(100),
  GROQ_API_KEY: z.string().optional(),
  GROK_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
  AI_FAILOVER_ORDER: z.string().default("groq,grok,openai"),
});
