import type { JSONContent } from "@tiptap/core";

export type User = { id: string; name: string; email: string };

export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
  ownerName: string;
  shareCount?: number; // only set on the owner's own list
};

export type DocumentDetail = DocumentSummary & {
  content: JSONContent;
  isOwner: boolean;
};

export type ShareInfo = {
  sharedWith: User[]; // people who already have access
  available: User[]; // demo users the owner can still share with
};
