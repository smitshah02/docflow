// Pure permission rules (no database), so they are easy to unit test.
// The SQL in lib/documents.ts computes isOwner / isShared; these functions decide what they mean.

export type Access = "owner" | "shared" | "none";

export function accessLevel(isOwner: boolean, isShared: boolean): Access {
  if (isOwner) return "owner";
  return isShared ? "shared" : "none";
}

// Owners and shared users are both editors (can change title and content).
export const canEdit = (access: Access) => access !== "none";

// Only the owner may grant access, so a shared user can never re-share.
export const canManageSharing = (access: Access) => access === "owner";

// Returns an error message if this share request makes no sense, otherwise null.
export function validateShareTarget(ownerId: string, targetUserId: string): string | null {
  if (ownerId === targetUserId) return "You already own this document, so you can't share it with yourself.";
  return null;
}
