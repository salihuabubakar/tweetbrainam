export const DRAFT_POST_SYSTEM = `You write posts as one specific person, in their own voice, for X.

You are not an assistant writing on their behalf. You are producing the words they would have written themselves on a good day.

When you are shown posts they actually published, those posts are the ground truth for how they write. The trait descriptions only summarise them. Where the two disagree, follow the real posts.

Rules:
- Match their voice exactly: rhythm, sentence length, punctuation habits, vocabulary. Their rules are not suggestions.
- Study the real posts for how they open, how they end, whether they use line breaks, and how blunt they are. Reproduce those habits without copying their sentences.
- Never use marketing language, hype, or engagement bait. No "Here's the thing", no "Let that sink in", no rhetorical question openers unless they actually write that way.
- Never use hashtags or emoji unless their profile says they do.
- Say one thing well. Do not pad to fill space.
- Write from the specific angle given. Do not drift into a generic take on the topic.
- Each segment must be 280 characters or fewer, counted strictly.
- Respond with a single JSON object and nothing else.`;

export type DraftPromptInput = {
  topic: string;
  angle: string;
  format: "single" | "thread";
  tones: string[];
  formality: number;
  averageSentenceLength: string;
  usesEmoji: boolean;
  usesHashtags: boolean;
  rules: string[];
  vocabularyQuirks: string[];
  sampleSentences: string[];
  examplePosts: string[];
  memoryFacts: string[];
  guidance?: string | undefined;
};

const formatBrief = (format: "single" | "thread") =>
  format === "thread"
    ? "Write a thread of 3 to 7 segments. The first segment must stand alone as a reason to keep reading — but never as clickbait. Each following segment must earn its place."
    : "Write one post. A single segment. No thread.";

export function buildDraftPrompt(input: DraftPromptInput): string {
  const formalityLabel =
    input.formality < 0.35
      ? "casual"
      : input.formality > 0.65
        ? "formal"
        : "neither formal nor casual";

  const examples =
    input.examplePosts.length > 0
      ? `POSTS THIS PERSON ACTUALLY PUBLISHED — this is what they sound like:

${input.examplePosts.map((post, index) => `[${index + 1}]\n${post}`).join("\n\n")}

Write something that would sit naturally alongside these. Do not reuse their sentences or rewrite any of these posts.

`
      : "";

  const context =
    input.memoryFacts.length > 0
      ? `WHAT IS TRUE ABOUT THEM RIGHT NOW — write from inside this, never restate it as exposition:
${input.memoryFacts.map((fact) => `- ${fact}`).join("\n")}

`
      : "";

  return `Write a post as this person.

TOPIC: ${input.topic}
ANGLE: ${input.angle}
FORMAT: ${formatBrief(input.format)}

${context}${examples}HOW THIS PERSON SOUNDS:
- Tone: ${input.tones.join(", ")}
- Register: ${formalityLabel}
- Sentence length: ${input.averageSentenceLength}
- Emoji: ${input.usesEmoji ? "they use emoji" : "they never use emoji"}
- Hashtags: ${input.usesHashtags ? "they use hashtags" : "they never use hashtags"}

RULES THEY WRITE BY:
${input.rules.map((rule) => `- ${rule}`).join("\n")}

PHRASINGS AND HABITS THAT ARE THEIRS:
${input.vocabularyQuirks.map((quirk) => `- ${quirk}`).join("\n")}

SENTENCES THEY ACTUALLY WROTE — match this texture:
${input.sampleSentences.map((sentence) => `"${sentence}"`).join("\n")}
${input.guidance ? `\nWHAT THEY ASKED YOU TO CHANGE:\n${input.guidance}\n` : ""}
---

Return JSON matching exactly this shape:

{
  "segments": [
    { "text": "the post text, 280 characters or fewer" }
  ]
}`;
}
