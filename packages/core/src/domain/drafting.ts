export const draftStatuses = [
  "generating",
  "needs_review",
  "approved",
  "rejected",
  "archived",
  "failed",
] as const;

export type DraftStatus = (typeof draftStatuses)[number];

export const draftAuthors = ["ai", "user"] as const;

export type DraftAuthor = (typeof draftAuthors)[number];

export type DraftSegment = {
  text: string;
};

export type DraftVersion = {
  id: string;
  version: number;
  segments: DraftSegment[];
  author: DraftAuthor;
  createdAt: Date;
};

export type Draft = {
  id: string;
  planSlotId: string | null;
  status: DraftStatus;
  currentVersion: DraftVersion | null;
};

export const MAX_SEGMENT_LENGTH = 280;

const allowedTransitions: Record<DraftStatus, readonly DraftStatus[]> = {
  generating: ["needs_review", "failed"],
  needs_review: ["approved", "rejected", "needs_review"],
  approved: ["needs_review", "archived"],
  rejected: ["archived", "needs_review"],
  archived: [],
  failed: ["generating"],
};

export function canTransition(from: DraftStatus, to: DraftStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function segmentsWithinLimit(segments: DraftSegment[]): boolean {
  return segments.every((segment) => segment.text.trim().length <= MAX_SEGMENT_LENGTH);
}

export function isPublishable(draft: Draft): boolean {
  return (
    draft.status === "approved" &&
    draft.currentVersion !== null &&
    draft.currentVersion.segments.length > 0 &&
    segmentsWithinLimit(draft.currentVersion.segments)
  );
}

export function segmentsToPlainText(segments: DraftSegment[]): string {
  return segments.map((segment) => segment.text.trim()).join("\n\n");
}
