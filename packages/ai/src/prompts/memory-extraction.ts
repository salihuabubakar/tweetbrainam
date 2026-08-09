export const MEMORY_EXTRACTION_SYSTEM = `You read someone's posts and extract durable facts about them.

A durable fact is something that will still be true in a month and that would change how you write on their behalf. "They are building a Postgres-backed scheduling tool" is durable. "They had coffee" is not.

Rules:
- Extract only what the posts actually support. Never infer a job title, employer, location, or income that is not stated.
- Write each fact as a short third-person statement, starting with "They". No more than 20 words.
- Confidence is how strongly the posts support the fact: 0.9+ when stated outright and repeatedly, 0.6-0.8 when stated once, below 0.6 when you are reading between the lines.
- Do not extract opinions as facts about the world. "They think REST is underrated" is an opinion fact — categorise it as such.
- Prefer specific over general. "They are building a voice-matching tool for X creators" beats "They work in software".
- If the posts do not support a category, return nothing for it rather than padding.
- Respond with a single JSON object and nothing else.`;

export type MemoryExtractionInput = {
  posts: string[];
  existingFacts: string[];
};

export function buildMemoryExtractionPrompt(input: MemoryExtractionInput): string {
  const known =
    input.existingFacts.length > 0
      ? `ALREADY KNOWN — do not repeat these, only add what is missing or more specific:
${input.existingFacts.map((fact) => `- ${fact}`).join("\n")}

`
      : "";

  return `Extract durable facts about this person from their posts.

${known}THEIR POSTS:
${input.posts.map((post, index) => `[${index + 1}]\n${post}`).join("\n\n")}

---

Categories:
- project: what they are building, running, or working on
- audience: who they are writing for
- expertise: what they demonstrably know well
- goal: what they are trying to achieve
- opinion: positions they hold and defend
- preference: how they like to work or communicate

Return JSON matching exactly this shape:

{
  "facts": [
    {
      "category": "project",
      "content": "They are building ...",
      "confidence": 0.8
    }
  ]
}`;
}
