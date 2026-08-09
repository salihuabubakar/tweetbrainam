import { type DomainError, domainError } from "../domain/errors";
import { selectFactsForPrompt } from "../domain/memory";
import type { UserPreferences } from "../domain/onboarding";
import {
  type ContentPlan,
  type PostFormat,
  type PostingWindow,
  inferPostingWindows,
  localWallClockToUtc,
  mondayOf,
  resolvePostingWindows,
} from "../domain/planning";
import { type Result, err, ok } from "../lib/result";
import type { AIProvider, GenerationUsage } from "../ports/ai-provider";
import type { Clock } from "../ports/clock";
import type { IdentityRepository } from "../ports/identity-repository";
import type { IngestionRepository } from "../ports/ingestion-repository";
import type { MemoryRepository } from "../ports/memory-repository";
import type { PlanRepository } from "../ports/plan-repository";
import type { VoiceRepository } from "../ports/voice-repository";
import { type QuotaDeps, checkUserQuota, recordUsage } from "./enforce-quota";

const RECENT_POST_SAMPLE_SIZE = 12;
const POST_TIME_SAMPLE_SIZE = 200;

export type WeeklyPlanRequest = {
  system: string;
  prompt: string;
  schema: Parameters<AIProvider["generateObject"]>[0]["schema"];
};

export type WeeklyPlanPromptInput = {
  goal: string;
  postsPerWeek: number;
  topics: string[];
  voiceRules: string[];
  recentPostSamples: string[];
  memoryFacts: string[];
};

export type GenerateWeeklyPlanDeps = QuotaDeps & {
  identity: IdentityRepository;
  ingestion: IngestionRepository;
  voice: VoiceRepository;
  memory: MemoryRepository;
  plans: PlanRepository;
  ai: AIProvider;
  clock: Clock;
  buildRequest(input: WeeklyPlanPromptInput): WeeklyPlanRequest;
};

export type GenerateWeeklyPlanOutput = {
  plan: ContentPlan;
  usage: GenerationUsage | null;
};

type PlanShape = {
  rationale: string;
  slots: { topic: string; format: PostFormat; angle: string }[];
};

const defaultPreferences: UserPreferences = {
  postsPerWeek: 5,
  postingWindows: [],
};

export async function generateWeeklyPlan(
  deps: GenerateWeeklyPlanDeps,
  input: { userId: string; weekStart?: string },
): Promise<Result<GenerateWeeklyPlanOutput, DomainError>> {
  const user = await deps.identity.findUserById(input.userId);
  if (!user) return err(domainError("user_not_found", "Account not found."));

  const account = await deps.ingestion.findAccountByUserId(input.userId);
  if (!account) {
    return err(domainError("x_connection_revoked", "No connected X account found."));
  }

  const weekStart = input.weekStart ?? mondayOf(deps.clock.now());
  const existing = await deps.plans.findPlanByWeek(account.id, weekStart);
  if (existing) return ok({ plan: existing, usage: null });

  const profile = await deps.voice.findActiveProfile(account.id);
  if (!profile) {
    return err(domainError("voice_profile_missing", "We need your voice profile before planning."));
  }

  const quota = await checkUserQuota(deps, { userId: input.userId, metric: "plan_generated" });
  if (!quota.ok) return quota;

  const preferences = user.preferences ?? defaultPreferences;
  const postsPerWeek = preferences.postsPerWeek;
  const windows: PostingWindow[] = preferences.postingWindows ?? [];

  const facts = await deps.memory.listForUser(input.userId, "active");

  const request = deps.buildRequest({
    goal: preferences.goal ?? "grow_audience",
    postsPerWeek,
    topics: profile.topics,
    voiceRules: profile.traits.rules,
    recentPostSamples: await deps.voice.listSamplePosts(account.id, RECENT_POST_SAMPLE_SIZE),
    memoryFacts: selectFactsForPrompt(facts).map((fact) => fact.content),
  });

  const generated = await deps.ai.generateObject({
    purpose: "plan",
    system: request.system,
    prompt: request.prompt,
    schema: request.schema,
  });

  if (!generated.ok) {
    return err(domainError("generation_failed", generated.error.detail));
  }

  const analysis = generated.value.value as PlanShape;
  const learnedWindows =
    windows.length > 0
      ? windows
      : inferPostingWindows(
          await deps.voice.listPostTimes(account.id, POST_TIME_SAMPLE_SIZE),
          user.timezone,
          postsPerWeek,
        );
  const resolvedWindows = resolvePostingWindows(postsPerWeek, learnedWindows);
  const slots = analysis.slots.slice(0, resolvedWindows.length).map((slot, position) => ({
    topic: slot.topic,
    format: slot.format,
    angle: slot.angle,
    targetAt: localWallClockToUtc(
      weekStart,
      resolvedWindows[position] ?? { dayOffset: position % 7, hour: 9 },
      user.timezone,
    ),
    position,
  }));

  await recordUsage(deps, { userId: input.userId, metric: "plan_generated" });

  const plan = await deps.plans.savePlan({
    xAccountId: account.id,
    weekStart,
    rationale: analysis.rationale,
    slots,
  });

  return ok({ plan, usage: generated.value.usage });
}
