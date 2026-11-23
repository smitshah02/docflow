import type { JSONContent } from "@tiptap/core";
import { ApiError } from "./api";
import { findUser } from "./auth";
import { db } from "./db";
import { accessLevel, canManageSharing, validateShareTarget } from "./permissions";
import type { DocumentDetail, DocumentSummary, ShareInfo, User } from "./types";

// All document queries live here, and every one takes the acting user's id.
// Access rule: a user can open a document if they own it OR a document_shares row grants it.
// Phase 2 sharing only needs to INSERT into document_shares; these checks already honor it.

type SummaryRow = { id: string; title: string; updated_at: string; owner_name: string; share_count?: number };
type DetailRow = SummaryRow & { content: JSONContent; is_owner: boolean; is_shared: boolean };

const toSummary = (row: SummaryRow): DocumentSummary => ({
  id: row.id,
  title: row.title,
  updatedAt: new Date(row.updated_at).toISOString(),
  ownerName: row.owner_name,
  ...(row.share_count === undefined ? {} : { shareCount: row.share_count }),
});

export async function listDocuments(userId: string) {
  const sql = db();
  const [owned, shared] = await Promise.all([
    sql`SELECT d.id, d.title, d.updated_at, u.name AS owner_name,
               (SELECT count(*)::int FROM document_shares s WHERE s.document_id = d.id) AS share_count
        FROM documents d JOIN users u ON u.id = d.owner_id
        WHERE d.owner_id = ${userId}
        ORDER BY d.updated_at DESC`,
    sql`SELECT d.id, d.title, d.updated_at, u.name AS owner_name
        FROM document_shares s
        JOIN documents d ON d.id = s.document_id
        JOIN users u ON u.id = d.owner_id
        WHERE s.user_id = ${userId}
        ORDER BY d.updated_at DESC`,
  ]);
  return { owned: (owned as SummaryRow[]).map(toSummary), shared: (shared as SummaryRow[]).map(toSummary) };
}

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export async function createDocument(userId: string, title: string, content: JSONContent = EMPTY_DOC): Promise<DocumentSummary> {
  // Owner always comes from the authenticated user, never from the request body.
  const rows = (await db()`
    WITH new_doc AS (
      INSERT INTO documents (title, content, owner_id) VALUES (${title}, ${JSON.stringify(content)}::jsonb, ${userId})
      RETURNING id, title, updated_at, owner_id
    )
    SELECT n.id, n.title, n.updated_at, u.name AS owner_name
    FROM new_doc n JOIN users u ON u.id = n.owner_id`) as SummaryRow[];
  return toSummary(rows[0]);
}

// 404 if the document doesn't exist, 403 if it exists but this user has no access.
export async function getDocumentForUser(documentId: string, userId: string): Promise<DocumentDetail> {
  const rows = (await db()`
    SELECT d.id, d.title, d.content, d.updated_at, u.name AS owner_name,
           (d.owner_id = ${userId}) AS is_owner,
           EXISTS (SELECT 1 FROM document_shares s WHERE s.document_id = d.id AND s.user_id = ${userId}) AS is_shared
    FROM documents d JOIN users u ON u.id = d.owner_id
    WHERE d.id = ${documentId}`) as DetailRow[];
  const row = rows[0];
  if (!row) throw new ApiError(404, "Document not found.");
  if (accessLevel(row.is_owner, row.is_shared) === "none") throw new ApiError(403, "You don't have access to this document.");
  return { ...toSummary(row), content: row.content, isOwner: row.is_owner };
}

// Owners and shared users may edit title and content (shared users are editors).
// ponytail: last write wins; add an updated_at check if concurrent editing matters (Phase 2+).
export async function updateDocument(
  documentId: string,
  userId: string,
  changes: { title?: string; content?: JSONContent },
): Promise<{ updatedAt: string }> {
  const title = changes.title ?? null;
  const content = changes.content === undefined ? null : JSON.stringify(changes.content);
  // The access check is part of the UPDATE itself, so there is no check-then-write gap.
  const rows = (await db()`
    UPDATE documents
    SET title = COALESCE(${title}::text, title),
        content = COALESCE(${content}::jsonb, content),
        updated_at = now()
    WHERE id = ${documentId}
      AND (owner_id = ${userId}
           OR EXISTS (SELECT 1 FROM document_shares s WHERE s.document_id = documents.id AND s.user_id = ${userId}))
    RETURNING updated_at`) as { updated_at: string }[];
  if (!rows[0]) {
    // Nothing updated: either the document doesn't exist or this user has no access.
    const exists = ((await db()`SELECT 1 FROM documents WHERE id = ${documentId}`) as unknown[]).length > 0;
    throw exists ? new ApiError(403, "You don't have access to this document.") : new ApiError(404, "Document not found.");
  }
  return { updatedAt: new Date(rows[0].updated_at).toISOString() };
}

// Loads the document's owner and enforces "only the owner manages sharing" (404 / 403).
async function requireOwner(documentId: string, userId: string) {
  const rows = (await db()`SELECT owner_id FROM documents WHERE id = ${documentId}`) as { owner_id: string }[];
  if (!rows[0]) throw new ApiError(404, "Document not found.");
  const access = accessLevel(rows[0].owner_id === userId, false);
  if (!canManageSharing(access)) throw new ApiError(403, "Only the owner can manage sharing for this document.");
}

export async function getShareInfo(documentId: string, userId: string): Promise<ShareInfo> {
  await requireOwner(documentId, userId);
  const sql = db();
  const [sharedWith, available] = await Promise.all([
    sql`SELECT u.id, u.name, u.email FROM document_shares s JOIN users u ON u.id = s.user_id
        WHERE s.document_id = ${documentId} ORDER BY u.name`,
    sql`SELECT u.id, u.name, u.email FROM users u
        WHERE u.id <> ${userId}
          AND NOT EXISTS (SELECT 1 FROM document_shares s WHERE s.document_id = ${documentId} AND s.user_id = u.id)
        ORDER BY u.name`,
  ]);
  return { sharedWith: sharedWith as User[], available: available as User[] };
}

export async function shareDocument(documentId: string, ownerId: string, targetUserId: string): Promise<User> {
  await requireOwner(documentId, ownerId);
  const selfError = validateShareTarget(ownerId, targetUserId);
  if (selfError) throw new ApiError(400, selfError);
  const target = await findUser(targetUserId);
  if (!target) throw new ApiError(404, "That user does not exist.");

  // The UNIQUE (document_id, user_id) constraint makes duplicate prevention race-free.
  const inserted = (await db()`
    INSERT INTO document_shares (document_id, user_id) VALUES (${documentId}, ${targetUserId})
    ON CONFLICT (document_id, user_id) DO NOTHING
    RETURNING id`) as unknown[];
  if (inserted.length === 0) throw new ApiError(409, `This document is already shared with ${target.name}.`);
  return target;
}
