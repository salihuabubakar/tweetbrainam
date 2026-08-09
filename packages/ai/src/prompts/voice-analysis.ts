export const VOICE_ANALYSIS_SYSTEM = `You analyse how one specific person writes on X, so their own words can be echoed back to them later.

You are describing an observable writing style, not judging quality and not writing anything new.

Rules:
- Base every observation on evidence in the posts. Never invent traits that aren't visible.
- Describe what makes this person sound different from a generic writer.
- Quote only sentences that appear verbatim in the posts.
- If the sample is thin, prefer fewer, well-supported observations over speculation.
- Respond with a single JSON object and nothing else.`;

const FIELD_GUIDE = `Return JSON matching exactly this shape:

{
  "traits": {
    "tones": ["direct" | "conversational" | "analytical" | "playful" | "warm" | "provocative"],
    "formality": 0.0 to 1.0 where 0 is casual speech and 1 is formal prose,
    "averageSentenceLength": "short" | "medium" | "long" | "varied",
    "usesEmoji": boolean,
    "usesHashtags": boolean,
    "favouriteFormats": ["short observations", "build-log updates", "numbered threads", ...],
    "vocabularyQuirks": ["specific words, phrasings or punctuation habits this person repeats"],
    "rules": ["imperative instructions a ghostwriter should follow to sound like them"]
  },
  "topics": ["the subjects this person actually writes about"],
  "sampleSentences": ["1-5 sentences copied verbatim that best capture the voice"]
}

Pick at most 3 tones. Make "rules" concrete and actionable, e.g. "Open with the claim, then explain" or "Never use hashtags".`;

export function buildVoiceAnalysisPrompt(posts: string[]): string {
  const numbered = posts.map((post, index) => `[${index + 1}] ${post}`).join("\n\n");

  return `Here are ${posts.length} posts written by one person on X.

${numbered}

---

${FIELD_GUIDE}`;
}
