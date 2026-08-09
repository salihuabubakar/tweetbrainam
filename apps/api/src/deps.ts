import type {
  Clock,
  DraftRepository,
  IdentityRepository,
  IngestionRepository,
  JobRunner,
  MemoryRepository,
  OAuthStateStore,
  PkceGenerator,
  PlanRepository,
  ScheduleRepository,
  SessionStore,
  TokenCipher,
  UsageRepository,
  VoiceRepository,
  XOAuthClient,
} from "@tweetbrainam/core";
import {
  createDatabase,
  createDraftRepository,
  createIdentityRepository,
  createIngestionRepository,
  createMemoryRepository,
  createPlanRepository,
  createScheduleRepository,
  createUsageRepository,
  createVoiceRepository,
} from "@tweetbrainam/db";
import { createAesGcmTokenCipher, createXOAuthClient, pkceGenerator } from "@tweetbrainam/x-api";
import { Redis } from "ioredis";
import { env } from "./env";
import { createRedisOAuthStateStore, createRedisSessionStore } from "./lib/redis-stores";
import { createTriggerJobRunner } from "./lib/trigger-job-runner";

export type AppDeps = {
  pkce: PkceGenerator;
  states: OAuthStateStore;
  sessions: SessionStore;
  xOAuth: XOAuthClient;
  cipher: TokenCipher;
  identity: IdentityRepository;
  ingestion: IngestionRepository;
  voice: VoiceRepository;
  memory: MemoryRepository;
  plans: PlanRepository;
  drafts: DraftRepository;
  schedule: ScheduleRepository;
  usage: UsageRepository;
  jobs: JobRunner;
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
    ingestion: createIngestionRepository(db),
    voice: createVoiceRepository(db),
    memory: createMemoryRepository(db),
    plans: createPlanRepository(db),
    drafts: createDraftRepository(db),
    schedule: createScheduleRepository(db),
    usage: createUsageRepository(db),
    jobs: createTriggerJobRunner(Boolean(env.TRIGGER_SECRET_KEY)),
    clock: { now: () => new Date() },
  };
}
