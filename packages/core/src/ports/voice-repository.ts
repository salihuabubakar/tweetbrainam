import type { VoiceProfile, VoiceTraits } from "../domain/voice";

export type SaveVoiceProfileInput = {
  xAccountId: string;
  traits: VoiceTraits;
  topics: string[];
  sampleSentences: string[];
  source: VoiceProfile["source"];
  postsAnalyzed: number;
};

export type VoiceRepository = {
  listSamplePosts(xAccountId: string, limit: number): Promise<string[]>;
  listPostTimes(xAccountId: string, limit: number): Promise<Date[]>;
  findActiveProfile(xAccountId: string): Promise<VoiceProfile | null>;
  saveProfileAsActive(input: SaveVoiceProfileInput): Promise<VoiceProfile>;
};
