import { z } from "zod";

export const voiceToneSchema = z.enum([
  "direct",
  "conversational",
  "analytical",
  "playful",
  "warm",
  "provocative",
]);

export const voiceTraitsSchema = z.object({
  tones: z.array(voiceToneSchema).min(1).max(3),
  formality: z.number().min(0).max(1),
  averageSentenceLength: z.enum(["short", "medium", "long", "varied"]),
  usesEmoji: z.boolean(),
  usesHashtags: z.boolean(),
  favouriteFormats: z.array(z.string()).max(6),
  vocabularyQuirks: z.array(z.string()).max(10),
  rules: z.array(z.string()).max(10),
});

export const voiceAnalysisSchema = z.object({
  traits: voiceTraitsSchema,
  topics: z.array(z.string()).min(1).max(12),
  sampleSentences: z.array(z.string()).min(1).max(5),
});

export const voiceProfileSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  traits: voiceTraitsSchema,
  topics: z.array(z.string()),
  sampleSentences: z.array(z.string()),
  source: z.enum(["analysis", "user_edit", "refinement"]),
  isActive: z.boolean(),
  postsAnalyzed: z.number().int(),
});

export const editVoiceProfileInputSchema = z.object({
  traits: voiceTraitsSchema,
  topics: z.array(z.string().min(1).max(60)).min(1).max(12),
});

export type VoiceToneValue = z.infer<typeof voiceToneSchema>;
export type VoiceTraitsValue = z.infer<typeof voiceTraitsSchema>;
export type VoiceAnalysis = z.infer<typeof voiceAnalysisSchema>;
export type VoiceProfileValue = z.infer<typeof voiceProfileSchema>;
export type EditVoiceProfileInput = z.infer<typeof editVoiceProfileInputSchema>;
