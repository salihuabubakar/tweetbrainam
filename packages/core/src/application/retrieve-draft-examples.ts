import { MAX_DRAFT_EXAMPLES, extractSearchTerms, isUsableExample } from "../domain/retrieval";
import type { EmbeddingProvider } from "../ports/embedding-provider";
import type { ExamplePost, IngestionRepository } from "../ports/ingestion-repository";

export type RetrieveDraftExamplesDeps = {
  ingestion: IngestionRepository;
  embeddings: EmbeddingProvider | null;
};

export type RetrieveDraftExamplesInput = {
  xAccountId: string;
  topic: string;
  angle: string;
  limit?: number;
};

export type DraftExamples = {
  posts: ExamplePost[];
  strategy: "similarity" | "keyword" | "none";
};

async function bySimilarity(
  deps: RetrieveDraftExamplesDeps,
  input: RetrieveDraftExamplesInput,
  limit: number,
): Promise<ExamplePost[]> {
  if (!deps.embeddings) return [];

  const embedded = await deps.embeddings.embed([`${input.topic}. ${input.angle}`], "query");
  const vector = embedded.ok ? embedded.value[0] : undefined;
  if (!vector) return [];

  return deps.ingestion.findSimilarPosts(input.xAccountId, vector, limit);
}

export async function retrieveDraftExamples(
  deps: RetrieveDraftExamplesDeps,
  input: RetrieveDraftExamplesInput,
): Promise<DraftExamples> {
  const limit = input.limit ?? MAX_DRAFT_EXAMPLES;

  const similar = (await bySimilarity(deps, input, limit)).filter((post) =>
    isUsableExample(post.text),
  );
  if (similar.length > 0) return { posts: similar, strategy: "similarity" };

  const terms = extractSearchTerms(input.topic, input.angle);
  const matched = (await deps.ingestion.findPostsMatchingTerms(input.xAccountId, terms, limit))
    .filter((post) => isUsableExample(post.text))
    .slice(0, limit);

  if (matched.length > 0) return { posts: matched, strategy: "keyword" };

  return { posts: [], strategy: "none" };
}
