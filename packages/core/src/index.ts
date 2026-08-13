export {
  domainError,
  domainErrorCodes,
  type DomainError,
  type DomainErrorCode,
} from "./domain/errors";
export {
  connectionStatuses,
  type ConnectionStatus,
  type EncryptedTokenSet,
  type User,
  type XAccountSummary,
  type XProfile,
} from "./domain/identity";
export { onboardingSteps, type OnboardingStep } from "./domain/onboarding";
export { err, ok, type Result } from "./lib/result";
export type { Clock } from "./ports/clock";
export type { IdentityRepository } from "./ports/identity-repository";
export type { PkceGenerator, PkcePair, TokenCipher } from "./ports/security";
export type { OAuthStateStore, SessionStore } from "./ports/sessions";
export type { XOAuthClient, XTokenSet } from "./ports/x-oauth-client";
export {
  completeXSignIn,
  X_SCOPES,
  type CompleteXSignInDeps,
  type CompleteXSignInInput,
  type CompleteXSignInOutput,
} from "./application/complete-x-sign-in";
export { startXSignIn, type StartXSignInDeps } from "./application/start-x-sign-in";
export {
  autoAdvanceableSteps,
  canRevisit,
  contentGoals,
  hasReached,
  nextOnboardingStep,
  onboardingStepIndex,
  revisitableSteps,
  type ContentGoal,
  type UserGoals,
  type UserPreferences,
} from "./domain/onboarding";
export {
  addPlanSlot,
  removePlanSlot,
  restorePlanSlot,
  skipPlanSlot,
  updatePlanSlot,
  type EditPlanSlotsDeps,
} from "./application/edit-plan-slots";
export {
  canEditSlot,
  canRemoveSlot,
  canSkipSlot,
  DEFAULT_POSTING_HOURS,
  isPlanningHourInZone,
  localWallClockToUtc,
  MAX_SLOTS_PER_PLAN,
  mondayOf,
  nextMondayInZone,
  nextMondayOf,
  PLANNING_HOUR,
  planStatuses,
  postFormats,
  resolvePostingWindows,
  slotStatuses,
  type ContentPlan,
  type PlanSlot,
  type PlanStatus,
  type PostFormat,
  type PostingWindow,
  type SlotStatus,
} from "./domain/planning";
export type {
  NewPlanSlot,
  PlanRepository,
  SavePlanInput,
  SlotPatch,
} from "./ports/plan-repository";
export {
  canTransition,
  draftAuthors,
  draftStatuses,
  isPublishable,
  MAX_SEGMENT_LENGTH,
  segmentsToPlainText,
  segmentsWithinLimit,
  type Draft,
  type DraftAuthor,
  type DraftSegment,
  type DraftStatus,
  type DraftVersion,
} from "./domain/drafting";
export type {
  DraftListItem,
  DraftRepository,
  LearningSignalType,
} from "./ports/draft-repository";
export {
  generateDraft,
  type DraftBrief,
  type DraftPromptContext,
  type DraftRequest,
  type GenerateDraftDeps,
  type GenerateDraftInput,
  type GenerateDraftOutput,
} from "./application/generate-draft";
export {
  approveDraft,
  editDraft,
  rejectDraft,
  type ReviewDraftDeps,
} from "./application/review-draft";
export {
  canTransitionPublish,
  isDueForPublishing,
  isRetryable,
  publishFailureMessages,
  publishFailureReasons,
  publishStatuses,
  type PublishFailureReason,
  type PublishStatus,
  type ScheduledPost,
} from "./domain/publishing";
export type {
  ScheduleRepository,
  ScheduledPostWithContent,
} from "./ports/schedule-repository";
export type { PublishFailure, PublishInput, XPublishClient } from "./ports/x-publish-client";
export {
  canGenerate,
  checkQuota,
  currentPeriod,
  GRANDFATHERED_SUBSCRIPTION,
  isTrialExpired,
  planCodes,
  PLAN_LIMITS,
  PLAN_SCAN_LIMITS,
  quotaPeriod,
  subscriptionStatuses,
  TRIAL_DAYS,
  trialDaysRemaining,
  trialEndsAtFrom,
  usageMetrics,
  type PlanCode,
  type PlanLimits,
  type QuotaCheck,
  type Subscription,
  type SubscriptionStatus,
  type UsageMetric,
} from "./domain/usage";
export type { UsageRepository } from "./ports/usage-repository";
export {
  checkUserQuota,
  loadSubscription,
  recordUsage,
  type QuotaDeps,
} from "./application/enforce-quota";
export {
  publishScheduledPost,
  type PublishScheduledPostDeps,
  type PublishScheduledPostOutput,
} from "./application/publish-scheduled-post";
export {
  generateWeeklyPlan,
  type GenerateWeeklyPlanDeps,
  type GenerateWeeklyPlanOutput,
  type WeeklyPlanPromptInput,
  type WeeklyPlanRequest,
} from "./application/generate-weekly-plan";
export { acceptConsent, type AcceptConsentDeps } from "./application/accept-consent";
export { advanceOnboarding, type AdvanceOnboardingDeps } from "./application/advance-onboarding";
export { saveGoals, type SaveGoalsDeps } from "./application/save-goals";
export {
  analysisFailureMessages,
  analysisFailureReasons,
  analysisStates,
  ingestedPostTypes,
  isUsableForVoiceProfile,
  MIN_POSTS_FOR_VOICE_PROFILE,
  type AnalysisFailureReason,
  type AnalysisState,
  type IngestablePost,
  type IngestedPostType,
  type IngestionSummary,
  type PostMetrics,
} from "./domain/ingestion";
export type {
  ExamplePost,
  IngestionAccount,
  IngestionRepository,
} from "./ports/ingestion-repository";
export {
  embeddingPurposes,
  MAX_EMBEDDING_BATCH,
  type EmbeddingProvider,
  type EmbeddingPurpose,
} from "./ports/embedding-provider";
export {
  extractSearchTerms,
  isUsableExample,
  MAX_DRAFT_EXAMPLES,
  MIN_EXAMPLE_LENGTH,
} from "./domain/retrieval";
export {
  isDuplicateFact,
  MAX_ACTIVE_FACTS,
  MAX_FACTS_IN_PROMPT,
  memoryCategories,
  memorySources,
  memoryStatuses,
  MIN_EXTRACTION_CONFIDENCE,
  selectFactsForPrompt,
  type MemoryCategory,
  type MemoryFact,
  type MemorySource,
  type MemoryStatus,
  type NewMemoryFact,
} from "./domain/memory";
export type { MemoryRepository } from "./ports/memory-repository";
export {
  draftReadyNotification,
  notificationKinds,
  publishFailedNotification,
  weekPlannedNotification,
  type NewPushSubscription,
  type Notification,
  type NotificationKind,
  type PushSubscription,
} from "./domain/notifications";
export type { NotificationRepository } from "./ports/notification-repository";
export type { PushDelivery, PushSender } from "./ports/push-sender";
export {
  notifyUser,
  type NotifyUserDeps,
  type NotifyUserOutput,
} from "./application/notify-user";
export {
  extractMemoryFacts,
  type ExtractMemoryFactsDeps,
  type ExtractMemoryFactsOutput,
  type MemoryExtractionRequest,
} from "./application/extract-memory-facts";
export {
  addMemoryFact,
  archiveMemoryFact,
  updateMemoryFact,
  type EditMemoryFactsDeps,
} from "./application/edit-memory-facts";
export {
  embedAccountPosts,
  EMBEDDING_BATCH_SIZE,
  type EmbedAccountPostsDeps,
  type EmbedAccountPostsOutput,
} from "./application/embed-account-posts";
export {
  retrieveDraftExamples,
  type DraftExamples,
  type RetrieveDraftExamplesDeps,
  type RetrieveDraftExamplesInput,
} from "./application/retrieve-draft-examples";
export type { FetchFailure, FetchRecentPostsInput, XContentClient } from "./ports/x-content-client";
export {
  ingestAccountPosts,
  type IngestAccountPostsDeps,
  type IngestAccountPostsInput,
} from "./application/ingest-account-posts";
export type { JobRunner } from "./ports/job-runner";
export {
  generationPurposes,
  type AIFailure,
  type AIProvider,
  type GenerateObjectInput,
  type GenerateObjectOutput,
  type GenerationPurpose,
  type GenerationUsage,
} from "./ports/ai-provider";
export {
  MAX_SAMPLE_POSTS_FOR_ANALYSIS,
  voiceTones,
  type VoiceProfile,
  type VoiceTone,
  type VoiceTraits,
} from "./domain/voice";
export type { SaveVoiceProfileInput, VoiceRepository } from "./ports/voice-repository";
export {
  editVoiceProfile,
  type EditVoiceProfileDeps,
  type EditVoiceProfileInput,
} from "./application/edit-voice-profile";
export {
  buildVoiceProfile,
  hasEnoughPostsForConfidentProfile,
  type BuildVoiceProfileDeps,
  type BuildVoiceProfileOutput,
  type VoiceAnalysisRequest,
} from "./application/build-voice-profile";
export { postSources, type PostSource } from "./domain/ingestion";
export { parsePastedPosts } from "./domain/pasted-posts";
export {
  importPastedPosts,
  type ImportPastedPostsDeps,
  type ImportPastedPostsInput,
} from "./application/import-pasted-posts";
export {
  getAnalysisStatus,
  type AnalysisStatus,
  type GetAnalysisStatusDeps,
} from "./application/get-analysis-status";
export {
  getSettings,
  type GetSettingsDeps,
  type SettingsSummary,
  type UsageLine,
} from "./application/get-settings";
export {
  updatePreferences,
  MAX_POSTS_PER_WEEK,
  MIN_POSTS_PER_WEEK,
  type UpdatePreferencesDeps,
  type UpdatePreferencesInput,
} from "./application/update-preferences";
export {
  deleteAccount,
  type DeleteAccountDeps,
  type DeleteAccountOutput,
} from "./application/delete-account";
