import { describe, expect, it } from "vitest";
import { decodeText, MAX_IMPORT_BYTES, textToDoc, titleFromFileName, validateFileMeta } from "./importText";
import { isValidContent } from "./validation";

const bytes = (...values: number[]) => new Uint8Array(values).buffer;
const encode = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe("validateFileMeta (type and size)", () => {
  it("accepts .txt up to 1 MB, case-insensitive", () => {
    expect(validateFileMeta("notes.txt", 10)).toBeNull();
    expect(validateFileMeta("NOTES.TXT", MAX_IMPORT_BYTES)).toBeNull();
  });
  it("rejects other types, empty files and oversize files", () => {
    expect(validateFileMeta("report.pdf", 10)).toMatch(/\.txt/);
    expect(validateFileMeta("notes.txt.exe", 10)).toMatch(/\.txt/);
    expect(validateFileMeta("notes", 10)).toMatch(/\.txt/);
    expect(validateFileMeta("notes.txt", 0)).toMatch(/empty/);
    expect(validateFileMeta("notes.txt", MAX_IMPORT_BYTES + 1)).toMatch(/1 MB/);
  });
});

describe("decodeText", () => {
  it("decodes UTF-8 and strips a BOM", () => {
    expect(decodeText(encode("﻿Héllo ✓"))).toEqual({ text: "Héllo ✓" });
  });
  it("rejects invalid UTF-8, binary data and blank files", () => {
    expect(decodeText(bytes(0xff, 0xfe, 0x41))).toHaveProperty("error");
    expect(decodeText(encode("abc\0def"))).toHaveProperty("error");
    expect(decodeText(encode("  \n\n "))).toHaveProperty("error");
  });
});

describe("textToDoc", () => {
  it("turns blank-line separated text into paragraphs", () => {
    const doc = textToDoc("First paragraph.\n\nSecond paragraph.");
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[1]).toEqual({ type: "paragraph", content: [{ type: "text", text: "Second paragraph." }] });
  });
  it("keeps single newlines as line breaks and handles CRLF and extra blank lines", () => {
    const doc = textToDoc("line one\r\nline two\r\n\r\n\r\n\r\nnext");
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[0].content?.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
  });
  it("never emits empty text nodes and always produces content the server accepts", () => {
    const doc = textToDoc("a\n\nb\n \nc\n\n\n<script>alert(1)</script>");
    expect(JSON.stringify(doc)).not.toContain('"text":""');
    expect(isValidContent(doc)).toBe(true);
  });
});

describe("titleFromFileName", () => {
  it("uses the file name without extension, with a fallback", () => {
    expect(titleFromFileName("Meeting notes.txt")).toBe("Meeting notes");
    expect(titleFromFileName(".txt")).toBe("Imported document");
    expect(titleFromFileName("x".repeat(500) + ".txt")).toHaveLength(200);
  });
});
