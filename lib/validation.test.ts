import { describe, expect, it } from "vitest";
import { isUuid, isValidContent, parseTitle } from "./validation";

const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("validation", () => {
  it("accepts editor output", () => {
    const good = doc(
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hi", marks: [{ type: "bold" }] }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
    );
    expect(isValidContent(good)).toBe(true);
  });

  it("rejects unknown nodes, marks, bad heading levels and non-docs", () => {
    expect(isValidContent(doc({ type: "script" }))).toBe(false);
    expect(isValidContent(doc({ type: "text", text: "x", marks: [{ type: "link" }] }))).toBe(false);
    expect(isValidContent(doc({ type: "heading", attrs: { level: 9 } }))).toBe(false);
    expect(isValidContent({ type: "paragraph" })).toBe(false);
    expect(isValidContent("nope")).toBe(false);
  });

  it("validates titles and ids", () => {
    expect(parseTitle("  Hello ")).toEqual({ title: "Hello" });
    expect(parseTitle("   ")).toHaveProperty("error");
    expect(parseTitle("x".repeat(201))).toHaveProperty("error");
    expect(isUuid("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUuid("1; DROP TABLE users")).toBe(false);
  });
});
