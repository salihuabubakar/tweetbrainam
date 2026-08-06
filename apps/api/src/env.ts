import { nodeEnvSchema, parseEnv } from "@tweetbrainam/config";
import { z } from "zod";

export const env = parseEnv({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().default(3001),
  APP_URL: z.string().url().default("http://localhost:3000"),
});
