import type { Draft, DraftAuthor, DraftSegment, DraftStatus } from "../domain/drafting";

export type LearningSignalType = "edit_diff" | "rejection" | "regeneration_note";

export type DraftListItem = Draft & {
  topic: string | null;
  targetAt: Date | null;
  updatedAt: Date;
};

export type DraftRepository = {
  findById(draftId: string): Promise<Draft | null>;
  listForAccount(xAccountId: string, status: DraftStatus): Promise<DraftListItem[]>;
  findBySlot(planSlotId: string): Promise<Draft | null>;
  createGenerating(xAccountId: string, planSlotId: string | null): Promise<Draft>;
  addVersion(draftId: string, segments: DraftSegment[], author: DraftAuthor): Promise<Draft>;
  setStatus(draftId: string, status: DraftStatus): Promise<void>;
  recordLearningSignal(input: {
    xAccountId: string;
    draftId: string;
    type: LearningSignalType;
    payload: Record<string, unknown>;
  }): Promise<void>;
  findAccountIdForDraft(draftId: string): Promise<string | null>;
};
