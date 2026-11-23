import type { JSONContent } from "@tiptap/core";
import { MAX_TITLE_LENGTH } from "./validation";

// .txt import helpers (pure functions; the route handler wires them to the request).
export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB

// Checks name + size only; used by both the browser (fast feedback) and the server (authoritative).
export function validateFileMeta(name: string, size: number): string | null {
  if (!name.toLowerCase().endsWith(".txt")) return "Only .txt files can be imported.";
  if (size === 0) return "The file is empty.";
  if (size > MAX_IMPORT_BYTES) return "The file is larger than the 1 MB limit.";
  return null;
}

// Strict UTF-8 decode: invalid byte sequences and binary content (NUL bytes) are rejected.
export function decodeText(bytes: ArrayBuffer): { text: string } | { error: string } {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { error: "The file is not valid UTF-8 text." };
  }
  if (text.includes("\0")) return { error: "The file looks like binary data, not plain text." };
  text = text.replace(/^﻿/, ""); // strip BOM
  if (!text.trim()) return { error: "The file has no text content." };
  return { text };
}

// Blank lines separate paragraphs; single newlines inside a paragraph become line breaks.
// Only uses nodes the server's content validator allows (paragraph, text, hardBreak).
export function textToDoc(text: string): JSONContent {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter((block) => block.trim());

  return {
    type: "doc",
    content: paragraphs.map((block) => {
      const content: JSONContent[] = [];
      block.split("\n").forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line }); // Tiptap rejects empty text nodes
      });
      return { type: "paragraph", content };
    }),
  };
}

export function titleFromFileName(name: string): string {
  const title = name.replace(/\.txt$/i, "").trim().slice(0, MAX_TITLE_LENGTH);
  return title || "Imported document";
}
