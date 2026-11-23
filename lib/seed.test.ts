import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Guards the bug where the welcome content was seeded as a real, shared document.
describe("db/seed.sql", () => {
  const seed = readFileSync("db/seed.sql", "utf8");
  const statements = seed.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

  it("does not insert any documents or shares", () => {
    expect(statements).not.toMatch(/INSERT INTO documents/i);
    expect(statements).not.toMatch(/INSERT INTO document_shares/i);
  });

  it("only deletes the one identified legacy welcome row (by id, title, owner, unedited)", () => {
    const deletes = statements.match(/DELETE FROM[\s\S]*?;/gi) ?? [];
    expect(deletes).toHaveLength(1);
    expect(deletes[0]).toMatch(/id = '00000000-0000-4000-8000-0000000000d1'/);
    expect(deletes[0]).toMatch(/title = 'Welcome to DocFlow'/);
    expect(deletes[0]).toMatch(/owner_id = /);
    expect(deletes[0]).toMatch(/created_at = updated_at/);
  });
});
