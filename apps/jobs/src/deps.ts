import {
  type AIProviderName,
  DRAFT_POST_SYSTEM,
  MEMORY_EXTRACTION_SYSTEM,
  VOICE_ANALYSIS_SYSTEM,
  WEEKLY_PLAN_SYSTEM,
  buildDraftPrompt,
  buildMemoryExtractionPrompt,
  buildVoiceAnalysisPrompt,
  buildWeeklyPlanPrompt,
  resolveAIProvider,
  resolveEmbeddingProvider,
} from "@tweetbrainam/ai";
import {
  draftContentSchema,
  memoryExtractionSchema,
  voiceAnalysisSchema,
  weeklyPlanAnalysisSchema,
} from "@tweetbrainam/contracts";
import type {
  BuildVoiceProfileDeps,
  EmbedAccountPostsDeps,
  ExtractMemoryFactsDeps,
  GenerateDraftDeps,
  GenerateWeeklyPlanDeps,
  IngestAccountPostsDeps,
  PublishScheduledPostDeps,
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
import {
  createAesGcmTokenCipher,
  createXContentClient,
  createXPublishClient,
} from "@tweetbrainam/x-api";
import { env } from "./env";

const database = () => createDatabase(env.DATABASE_URL);

const aiProvider = () => {
  const order = env.AI_FAILOVER_ORDER.split(",")
    .map((name) => name.trim())
    .filter((name): name is AIProviderName => ["groq", "grok", "openai"].includes(name));

  return resolveAIProvider(order, {
    ...(env.GROQ_API_KEY ? { groq: env.GROQ_API_KEY } : {}),
    ...(env.GROK_API_KEY ? { grok: env.GROK_API_KEY } : {}),
    ...(env.OPENAI_API_KEY ? { openai: env.OPENAI_API_KEY } : {}),
  });
};

const embeddingProvider = () =>
  resolveEmbeddingProvider({ cohere: env.COHERE_API_KEY, openai: env.OPENAI_API_KEY });

export function createEmbeddingDeps(): EmbedAccountPostsDeps {
  return {
    ingestion: createIngestionRepository(database()),
    embeddings: embeddingProvider(),
  };
}

export function createIngestionDeps(): IngestAccountPostsDeps {
  const db = database();
  return {
    ingestion: createIngestionRepository(db),
    xContent: createXContentClient(),
    cipher: createAesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY),
  };
}

export function createVoiceDeps(): BuildVoiceProfileDeps {
  const db = database();
  return {
    ingestion: createIngestionRepository(db),
    voice: createVoiceRepository(db),
    ai: aiProvider(),
    buildRequest: (posts) => ({
      system: VOICE_ANALYSIS_SYSTEM,
      prompt: buildVoiceAnalysisPrompt(posts),
      schema: voiceAnalysisSchema,
    }),
  };
}

export function createMemoryDeps(): ExtractMemoryFactsDeps {
  const db = database();
  return {
    ingestion: createIngestionRepository(db),
    voice: createVoiceRepository(db),
    memory: createMemoryRepository(db),
    ai: aiProvider(),
    buildRequest: (input) => ({
      system: MEMORY_EXTRACTION_SYSTEM,
      prompt: buildMemoryExtractionPrompt(input),
      schema: memoryExtractionSchema,
    }),
  };
}

export function createIdentityDeps() {
  return createIdentityRepository(database());
}

export function createPublishDeps(): PublishScheduledPostDeps {
  const db = database();
  return {
    schedule: createScheduleRepository(db),
    drafts: createDraftRepository(db),
    plans: createPlanRepository(db),
    ingestion: createIngestionRepository(db),
    publisher: createXPublishClient(),
    cipher: createAesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY),
  };
}

export function createDraftDeps(): GenerateDraftDeps {
  const db = database();
  return {
    drafts: createDraftRepository(db),
    plans: createPlanRepository(db),
    voice: createVoiceRepository(db),
    ingestion: createIngestionRepository(db),
    memory: createMemoryRepository(db),
    embeddings: embeddingProvider(),
    ai: aiProvider(),
    usage: createUsageRepository(db),
    clock: { now: () => new Date() },
    buildRequest: (context) => ({
      system: DRAFT_POST_SYSTEM,
      prompt: buildDraftPrompt(context),
      schema: draftContentSchema,
    }),
  };
}

export function createPlanDeps(): GenerateWeeklyPlanDeps {
  const db = database();
  return {
    identity: createIdentityRepository(db),
    ingestion: createIngestionRepository(db),
    voice: createVoiceRepository(db),
    memory: createMemoryRepository(db),
    plans: createPlanRepository(db),
    ai: aiProvider(),
    usage: createUsageRepository(db),
    clock: { now: () => new Date() },
    buildRequest: (input) => ({
      system: WEEKLY_PLAN_SYSTEM,
      prompt: buildWeeklyPlanPrompt(input),
      schema: weeklyPlanAnalysisSchema,
    }),
  };
}
