const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "more",
  "most",
  "my",
  "not",
  "of",
  "on",
  "one",
  "or",
  "our",
  "out",
  "so",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "up",
  "was",
  "we",
  "were",
  "what",
  "when",
  "why",
  "will",
  "with",
  "you",
  "your",
]);

const MIN_TERM_LENGTH = 3;

export const MAX_DRAFT_EXAMPLES = 8;
export const MIN_EXAMPLE_LENGTH = 40;

export function extractSearchTerms(...phrases: string[]): string[] {
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const words = phrase.toLowerCase().split(/[^a-z0-9']+/);
    for (const word of words) {
      if (word.length < MIN_TERM_LENGTH || STOP_WORDS.has(word)) continue;
      seen.add(word);
    }
  }

  return [...seen];
}

export function isUsableExample(text: string): boolean {
  return text.trim().length >= MIN_EXAMPLE_LENGTH;
}
