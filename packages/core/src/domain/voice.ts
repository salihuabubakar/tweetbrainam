export const voiceTones = [
  "direct",
  "conversational",
  "analytical",
  "playful",
  "warm",
  "provocative",
] as const;

export type VoiceTone = (typeof voiceTones)[number];

export type VoiceTraits = {
  tones: VoiceTone[];
  formality: number;
  averageSentenceLength: "short" | "medium" | "long" | "varied";
  usesEmoji: boolean;
  usesHashtags: boolean;
  favouriteFormats: string[];
  vocabularyQuirks: string[];
  rules: string[];
};

export type VoiceProfile = {
  id: string;
  version: number;
  traits: VoiceTraits;
  topics: string[];
  sampleSentences: string[];
  source: "analysis" | "user_edit" | "refinement";
  isActive: boolean;
  postsAnalyzed: number;
  createdAt: Date;
};

export const MAX_SAMPLE_POSTS_FOR_ANALYSIS = 60;
