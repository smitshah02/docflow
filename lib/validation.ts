import type { JSONContent } from "@tiptap/core";

// Relative imports only so this file stays unit-testable.

export const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_BYTES = 3_000_000; // JSON of a 1 MB .txt import must fit; stays under Vercel's 4.5 MB body limit
const MAX_DEPTH = 20;

// Only the Tiptap nodes/marks the editor can produce. Phase 2 file import should map onto these too.
const ALLOWED_NODES = new Set(["doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem", "hardBreak"]);
const ALLOWED_MARKS = new Set(["bold", "italic", "underline"]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// Returns the cleaned title, or an error message.
export function parseTitle(value: unknown): { title: string } | { error: string } {
  if (typeof value !== "string") return { error: "Title must be text." };
  const title = value.trim();
  if (!title) return { error: "Title cannot be empty." };
  if (title.length > MAX_TITLE_LENGTH) return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  return { title };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidNode(node: unknown, depth: number): boolean {
  if (depth > MAX_DEPTH || !isPlainObject(node)) return false;
  if (typeof node.type !== "string" || !ALLOWED_NODES.has(node.type)) return false;
  if (node.attrs !== undefined && !isPlainObject(node.attrs)) return false;

  if (node.type === "text") {
    if (typeof node.text !== "string") return false;
    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) return false;
      if (!node.marks.every((m) => isPlainObject(m) && typeof m.type === "string" && ALLOWED_MARKS.has(m.type))) return false;
    }
    return node.content === undefined;
  }
  if (node.type === "heading") {
    const level = isPlainObject(node.attrs) ? node.attrs.level : undefined;
    if (level !== 1 && level !== 2 && level !== 3) return false;
  }
  if (node.content === undefined) return true;
  return Array.isArray(node.content) && node.content.every((child) => isValidNode(child, depth + 1));
}

export function isValidContent(value: unknown): value is JSONContent {
  if (!isPlainObject(value) || value.type !== "doc") return false;
  if (JSON.stringify(value).length > MAX_CONTENT_BYTES) return false;
  return isValidNode(value, 0);
}
