import { randomBytes } from "node:crypto";
import type { OAuthStateStore, SessionStore } from "@tweetbrainam/core";
import type { Redis } from "ioredis";

const sessionKey = (id: string) => `session:${id}`;
const oauthStateKey = (state: string) => `oauth-state:${state}`;

export function createRedisSessionStore(redis: Redis): SessionStore {
  return {
    async create(userId, ttlSeconds) {
      const sessionId = randomBytes(32).toString("base64url");
      await redis.set(sessionKey(sessionId), userId, "EX", ttlSeconds);
      return sessionId;
    },
    async getUserId(sessionId) {
      return redis.get(sessionKey(sessionId));
    },
    async destroy(sessionId) {
      await redis.del(sessionKey(sessionId));
    },
  };
}

export function createRedisOAuthStateStore(redis: Redis): OAuthStateStore {
  return {
    async save(state, codeVerifier, ttlSeconds) {
      await redis.set(oauthStateKey(state), codeVerifier, "EX", ttlSeconds);
    },
    async consume(state) {
      return redis.getdel(oauthStateKey(state));
    },
  };
}
