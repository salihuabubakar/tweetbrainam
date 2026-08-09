import { type IngestablePost, isUsableForVoiceProfile } from "./ingestion";

const SEPARATOR = /\n\s*\n/;

function contentFingerprint(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

export function parsePastedPosts(raw: string, limit: number): IngestablePost[] {
  const seen = new Set<string>();
  const posts: IngestablePost[] = [];

  for (const block of raw.split(SEPARATOR)) {
    const text = block.trim();
    if (text.length === 0) continue;

    const fingerprint = contentFingerprint(text);
    if (seen.has(fingerprint)) continue;

    const post: IngestablePost = {
      xPostId: `manual-${fingerprint}`,
      type: "post",
      text,
      postedAt: null,
      metrics: null,
      source: "manual",
    };
    if (!isUsableForVoiceProfile(post)) continue;

    seen.add(fingerprint);
    posts.push(post);
    if (posts.length >= limit) break;
  }

  return posts;
}
