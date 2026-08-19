import { tasks } from "@trigger.dev/sdk";
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
  NotifyUserDeps,
  PublishScheduledPostDeps,
  QuotaDeps,
  VoiceBuildTrigger,
} from "@tweetbrainam/core";
import { createXTokenProvider } from "@tweetbrainam/core";
import {
  createDatabase,
  createDraftRepository,
  createIdentityRepository,
  createIngestionRepository,
  createMemoryRepository,
  createNotificationRepository,
  createPlanRepository,
  createScheduleRepository,
  createUsageRepository,
  createVoiceRepository,
  createXTokenRepository,
} from "@tweetbrainam/db";
import { resolvePushSender } from "@tweetbrainam/notifications";
import {
  createAesGcmTokenCipher,
  createXContentClient,
  createXOAuthClient,
  createXPublishClient,
} from "@tweetbrainam/x-api";
import { env } from "./env";

const database = () => createDatabase(env.DATABASE_URL);

const cipher = () => createAesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY);

const xTokens = () =>
  createXTokenProvider({
    tokens: createXTokenRepository(database()),
    xOAuth: createXOAuthClient({
      clientId: env.X_CLIENT_ID,
      clientSecret: env.X_CLIENT_SECRET,
      redirectUri: env.X_REDIRECT_URI,
    }),
    cipher: cipher(),
    clock: { now: () => new Date() },
  });

const aiProvider = () => {
  const order = env.AI_FAILOVER_ORDER.split(",")
    .map((name) => name.trim())
    .filter((name): name is AIProviderName => ["groq", "grok", "openai"].includes(name));

  return resolveAIProvider(
    order,
    {
      ...(env.GROQ_API_KEY ? { groq: env.GROQ_API_KEY } : {}),
      ...(env.GROK_API_KEY ? { grok: env.GROK_API_KEY } : {}),
      ...(env.OPENAI_API_KEY ? { openai: env.OPENAI_API_KEY } : {}),
    },
    {
      ...(env.GROQ_MODEL ? { groq: env.GROQ_MODEL } : {}),
      ...(env.GROK_MODEL ? { grok: env.GROK_MODEL } : {}),
      ...(env.OPENAI_MODEL ? { openai: env.OPENAI_MODEL } : {}),
    },
  );
};

const embeddingProvider = () =>
  resolveEmbeddingProvider({ cohere: env.COHERE_API_KEY, openai: env.OPENAI_API_KEY });

export function createEmbeddingDeps(): EmbedAccountPostsDeps {
  return {
    ingestion: createIngestionRepository(database()),
    embeddings: embeddingProvider(),
  };
}

const voiceBuildTrigger: VoiceBuildTrigger = {
  async startVoiceProfileBuild(userId) {
    await tasks.trigger("build-voice-profile", { userId });
  },
};

export function createIngestionDeps(): IngestAccountPostsDeps {
  const db = database();
  return {
    ingestion: createIngestionRepository(db),
    xContent: createXContentClient(),
    tokens: xTokens(),
    usage: createUsageRepository(db),
    clock: { now: () => new Date() },
    jobs: voiceBuildTrigger,
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

export function createNotifyDeps(): NotifyUserDeps | null {
  const push = resolvePushSender({
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  });

  if (!push) return null;
  return { notifications: createNotificationRepository(database()), push };
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

export function createQuotaDeps(): QuotaDeps {
  return {
    usage: createUsageRepository(database()),
    clock: { now: () => new Date() },
  };
}

export function createPublishDeps(): PublishScheduledPostDeps {
  const db = database();
  return {
    schedule: createScheduleRepository(db),
    drafts: createDraftRepository(db),
    plans: createPlanRepository(db),
    ingestion: createIngestionRepository(db),
    publisher: createXPublishClient(),
    tokens: xTokens(),
    usage: createUsageRepository(db),
    clock: { now: () => new Date() },
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
