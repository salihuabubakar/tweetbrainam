import { describe, expect, it } from "vitest";
import { parsePastedPosts } from "./pasted-posts";

const longPost = (label: string) =>
  `${label} — this is a long enough sample post to teach the model something about voice.`;

describe("parsePastedPosts", () => {
  it("splits posts on blank lines and keeps multi-line posts intact", () => {
    const raw = [longPost("first"), `${longPost("second")}\nstill the second post`].join("\n\n");
    const posts = parsePastedPosts(raw, 50);

    expect(posts).toHaveLength(2);
    expect(posts[1]?.text).toContain("still the second post");
  });

  it("drops posts too short to reveal voice", () => {
    const posts = parsePastedPosts(`${longPost("keep")}\n\nnope\n\nalso short`, 50);
    expect(posts).toHaveLength(1);
  });

  it("drops retweets", () => {
    const raw = `${longPost("mine")}\n\nRT @other: a retweet that is definitely long enough to pass.`;
    const posts = parsePastedPosts(raw, 50);
    expect(posts).toHaveLength(1);
  });

  it("deduplicates identical posts", () => {
    const raw = [longPost("same"), longPost("same"), longPost("different")].join("\n\n");
    const posts = parsePastedPosts(raw, 50);
    expect(posts).toHaveLength(2);
  });

  it("marks posts as manual with no date or metrics", () => {
    const post = parsePastedPosts(longPost("only"), 50)[0];
    expect(post?.source).toBe("manual");
    expect(post?.postedAt).toBeNull();
    expect(post?.metrics).toBeNull();
    expect(post?.xPostId.startsWith("manual-")).toBe(true);
  });

  it("respects the limit", () => {
    const raw = Array.from({ length: 10 }, (_, index) => longPost(`post ${index}`)).join("\n\n");
    expect(parsePastedPosts(raw, 4)).toHaveLength(4);
  });

  it("returns nothing for empty input", () => {
    expect(parsePastedPosts("   \n\n  ", 50)).toEqual([]);
  });
});
