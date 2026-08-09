export const WEEKLY_PLAN_SYSTEM = `You plan a week of original posts for one specific person on X.

You are choosing what they should write about — not writing the posts themselves.

Rules:
- Every slot must be something this person could credibly write, given their topics and expertise.
- When you know what they are actually working on, plan around that. A post about this week's real problem beats a well-formed post about a topic in the abstract.
- Vary the angle across the week. Do not propose seven versions of the same idea.
- Avoid topics they covered in their recent posts; find the next thing to say, not a repeat.
- Choose "thread" only when the idea genuinely needs several tweets to land. Most slots are "single".
- Serve their stated goal without ever sounding like an advertisement.
- Respond with a single JSON object and nothing else.`;

export type WeeklyPlanInput = {
  goal: string;
  postsPerWeek: number;
  topics: string[];
  voiceRules: string[];
  recentPostSamples: string[];
  memoryFacts: string[];
};

const GOAL_GUIDANCE: Record<string, string> = {
  grow_audience: "Prioritise ideas that are useful to people who don't follow them yet.",
  build_in_public: "Prioritise concrete progress, decisions, numbers, and what was learned.",
  authority: "Prioritise sharp opinions and hard-won lessons only they could write.",
  leads: "Prioritise problems their potential clients recognise, without pitching.",
};

export function buildWeeklyPlanPrompt(input: WeeklyPlanInput): string {
  const recent =
    input.recentPostSamples.length > 0
      ? input.recentPostSamples.map((post, index) => `[${index + 1}] ${post}`).join("\n\n")
      : "(no recent posts available)";

  const context =
    input.memoryFacts.length > 0
      ? `
WHAT IS TRUE ABOUT THEM RIGHT NOW — the best slots come from here, not from their topic list:
${input.memoryFacts.map((fact) => `- ${fact}`).join("\n")}
`
      : "";

  return `Plan ${input.postsPerWeek} posts for this person's week.

THEIR GOAL: ${input.goal}
${GOAL_GUIDANCE[input.goal] ?? ""}
${context}
TOPICS THEY WRITE ABOUT:
${input.topics.map((topic) => `- ${topic}`).join("\n")}

RULES THAT DEFINE THEIR VOICE:
${input.voiceRules.map((rule) => `- ${rule}`).join("\n")}

THINGS THEY RECENTLY POSTED (do not repeat these):
${recent}

---

Return JSON matching exactly this shape:

{
  "rationale": "one or two sentences explaining the shape of this week and why it serves their goal",
  "slots": [
    {
      "topic": "a short, specific subject line for the post",
      "format": "single" | "thread",
      "angle": "what this post should argue, reveal, or ask — specific enough to write from"
    }
  ]
}

Return exactly ${input.postsPerWeek} slots, ordered from the start of the week.`;
}
