import type {
  Clock,
  IdentityRepository,
  OAuthStateStore,
  PkceGenerator,
  SessionStore,
  TokenCipher,
  XOAuthClient,
} from "@tweetbrainam/core";
import { createDatabase, createIdentityRepository } from "@tweetbrainam/db";
import { createAesGcmTokenCipher, createXOAuthClient, pkceGenerator } from "@tweetbrainam/x-api";
import { Redis } from "ioredis";
import { env } from "./env";
import { createRedisOAuthStateStore, createRedisSessionStore } from "./lib/redis-stores";

export type AppDeps = {
  pkce: PkceGenerator;
  states: OAuthStateStore;
  sessions: SessionStore;
  xOAuth: XOAuthClient;
  cipher: TokenCipher;
  identity: IdentityRepository;
  clock: Clock;
};

export function createAppDeps(): AppDeps {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  const db = createDatabase(env.DATABASE_URL);

  return {
    pkce: pkceGenerator,
    states: createRedisOAuthStateStore(redis),
    sessions: createRedisSessionStore(redis),
    xOAuth: createXOAuthClient({
      clientId: env.X_CLIENT_ID,
      clientSecret: env.X_CLIENT_SECRET,
      redirectUri: env.X_REDIRECT_URI,
    }),
    cipher: createAesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY),
    identity: createIdentityRepository(db),
    clock: { now: () => new Date() },
  };
}
