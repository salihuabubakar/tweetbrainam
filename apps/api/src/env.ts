import { nodeEnvSchema, parseEnv } from "@tweetbrainam/config";
import { z } from "zod";

const DEV_PLACEHOLDER = "dev-placeholder";
const DEV_KEY = Buffer.alloc(32).toString("base64");

export const env = parseEnv({
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().default(3001),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://tweetbrainam:tweetbrainam@localhost:5433/tweetbrainam"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  X_CLIENT_ID: z.string().default(DEV_PLACEHOLDER),
  X_CLIENT_SECRET: z.string().default(DEV_PLACEHOLDER),
  X_REDIRECT_URI: z.string().url().default("http://localhost:3000/api/v1/auth/x/callback"),
  TOKEN_ENCRYPTION_KEY: z.string().default(DEV_KEY),
  TRIGGER_SECRET_KEY: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:hello@tweetbrainam.com"),
  INGESTION_MAX_POSTS: z.coerce.number().int().min(1).max(3200).default(100),
});

if (env.NODE_ENV === "production") {
  const placeholders = [env.X_CLIENT_ID, env.X_CLIENT_SECRET].includes(DEV_PLACEHOLDER);
  if (placeholders || env.TOKEN_ENCRYPTION_KEY === DEV_KEY) {
    throw new Error("Production requires real X credentials and TOKEN_ENCRYPTION_KEY.");
  }
}
