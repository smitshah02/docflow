// End-to-end API test against a RUNNING dev/prod server and the real Neon database.
// Skipped unless INTEGRATION=1. Run with: npm run dev (other terminal), then npm run test:integration
// Test documents are titled "[itest] ..." and are deleted afterwards.
import { neon } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const ALICE = "00000000-0000-4000-8000-000000000001";
const BOB = "00000000-0000-4000-8000-000000000002";
const CHARLIE = "00000000-0000-4000-8000-000000000003";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
async function call(user: string, path: string, init: RequestInit & { json?: unknown } = {}) {
  const headers: Record<string, string> = { Cookie: `docflow_user_id=${user}` };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(BASE + path, { ...init, headers, body });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Json };
}
const upload = (user: string, name: string, data: BlobPart) => {
  const form = new FormData();
  form.append("file", new File([data], name));
  return call(user, "/api/documents/import", { method: "POST", body: form });
};

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...text: string[]) => ({ type: "doc", content: text.map(paragraph) });

describe.skipIf(!process.env.INTEGRATION)("API against live database", () => {
  afterAll(async () => {
    if (process.env.DATABASE_URL) await neon(process.env.DATABASE_URL)`DELETE FROM documents WHERE title LIKE '[itest]%'`;
  });

  let docId = "";

  it("welcome page is available to every demo user and is not a document", async () => {
    const LEGACY_WELCOME_ID = "00000000-0000-4000-8000-0000000000d1";
    for (const user of [ALICE, BOB, CHARLIE]) {
      const page = await fetch(BASE + "/welcome", { headers: { Cookie: `docflow_user_id=${user}` } });
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("Welcome to DocFlow");

      const lists = (await call(user, "/api/documents")).body;
      const all = [...lists.owned, ...lists.shared];
      expect(all.map((d: Json) => d.title)).not.toContain("Welcome to DocFlow");
      expect(all.map((d: Json) => d.id)).not.toContain(LEGACY_WELCOME_ID);
      expect((await call(user, `/api/documents/${LEGACY_WELCOME_ID}`)).status).toBe(404); // no row, nothing to edit or share
    }
  });

  it("lists the three seeded demo users", async () => {
    const { status, body } = await call(ALICE, "/api/session");
    expect(status).toBe(200);
    expect(body.users.map((u: Json) => u.name)).toEqual(["Alice", "Bob", "Charlie"]);
    expect(body.currentUserId).toBe(ALICE);
  });

  it("owner creates, renames, edits and reads back a document", async () => {
    const created = await call(ALICE, "/api/documents", { method: "POST", json: { title: "[itest] draft" } });
    expect(created.status).toBe(201);
    docId = created.body.id;

    expect((await call(ALICE, `/api/documents/${docId}`, { method: "PATCH", json: { title: "[itest] renamed" } })).status).toBe(200);
    const content = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hi", marks: [{ type: "bold" }] }] }] };
    expect((await call(ALICE, `/api/documents/${docId}`, { method: "PATCH", json: { content } })).status).toBe(200);

    const read = await call(ALICE, `/api/documents/${docId}`);
    expect(read.body).toMatchObject({ title: "[itest] renamed", isOwner: true, ownerName: "Alice", content });
    const list = await call(ALICE, "/api/documents");
    expect(list.body.owned.map((d: Json) => d.id)).toContain(docId);
  });

  it("validates ids, titles and content", async () => {
    expect((await call(ALICE, "/api/documents/not-a-uuid")).status).toBe(400);
    expect((await call(ALICE, "/api/documents/00000000-0000-4000-8000-00000000ffff")).status).toBe(404);
    expect((await call(ALICE, `/api/documents/${docId}`, { method: "PATCH", json: { title: "   " } })).status).toBe(400);
    expect((await call(ALICE, `/api/documents/${docId}`, { method: "PATCH", json: { content: doc("x").content } })).status).toBe(400);
    expect((await call(ALICE, `/api/documents/${docId}`, { method: "PATCH", json: {} })).status).toBe(400);
  });

  it("blocks users without access", async () => {
    for (const user of [BOB, CHARLIE]) {
      expect((await call(user, `/api/documents/${docId}`)).status).toBe(403);
      expect((await call(user, `/api/documents/${docId}`, { method: "PATCH", json: { title: "[itest] hacked" } })).status).toBe(403);
      expect((await call(user, `/api/documents/${docId}/shares`)).status).toBe(403);
      expect((await call(user, `/api/documents/${docId}/shares`, { method: "POST", json: { userId: user } })).status).toBe(403);
      expect((await call(user, "/api/documents")).body.owned.map((d: Json) => d.id)).not.toContain(docId);
    }
  });

  it("ignores client-supplied ownership metadata", async () => {
    await call(BOB, `/api/documents/${docId}`, { method: "PATCH", json: { owner_id: BOB, title: "[itest] x" } }); // 403 anyway
    const read = await call(ALICE, `/api/documents/${docId}`);
    expect(read.body.ownerName).toBe("Alice");
    const created = await call(BOB, "/api/documents", { method: "POST", json: { title: "[itest] bobs", owner_id: ALICE } });
    expect(created.body.ownerName).toBe("Bob");
  });

  it("sharing: owner grants access; duplicates, self-share and unknown users are rejected", async () => {
    const info = await call(ALICE, `/api/documents/${docId}/shares`);
    expect(info.body.available.map((u: Json) => u.name)).toEqual(["Bob", "Charlie"]);
    expect(info.body.sharedWith).toEqual([]);

    expect((await call(ALICE, `/api/documents/${docId}/shares`, { method: "POST", json: { userId: BOB } })).status).toBe(201);
    expect((await call(ALICE, `/api/documents/${docId}/shares`, { method: "POST", json: { userId: BOB } })).status).toBe(409);
    expect((await call(ALICE, `/api/documents/${docId}/shares`, { method: "POST", json: { userId: ALICE } })).status).toBe(400);
    expect((await call(ALICE, `/api/documents/${docId}/shares`, { method: "POST", json: { userId: "nope" } })).status).toBe(400);
    expect((await call(ALICE, `/api/documents/${docId}/shares`, { method: "POST", json: { userId: "00000000-0000-4000-8000-00000000ffff" } })).status).toBe(404);

    const after = await call(ALICE, `/api/documents/${docId}/shares`);
    expect(after.body.sharedWith.map((u: Json) => u.name)).toEqual(["Bob"]);
    expect(after.body.available.map((u: Json) => u.name)).toEqual(["Charlie"]);
  });

  it("shared user can open and edit but cannot re-share; others stay blocked", async () => {
    const read = await call(BOB, `/api/documents/${docId}`);
    expect(read.status).toBe(200);
    expect(read.body.isOwner).toBe(false);

    const edit = doc("edited by Bob");
    expect((await call(BOB, `/api/documents/${docId}`, { method: "PATCH", json: { content: edit } })).status).toBe(200);
    expect((await call(ALICE, `/api/documents/${docId}`)).body.content).toEqual(edit);

    expect((await call(BOB, `/api/documents/${docId}/shares`, { method: "POST", json: { userId: CHARLIE } })).status).toBe(403);
    expect((await call(BOB, `/api/documents/${docId}/shares`)).status).toBe(403);
    expect((await call(CHARLIE, `/api/documents/${docId}`)).status).toBe(403);

    expect((await call(BOB, "/api/documents")).body.shared.map((d: Json) => d.id)).toContain(docId);
    const owned = (await call(ALICE, "/api/documents")).body.owned.find((d: Json) => d.id === docId);
    expect(owned.shareCount).toBe(1);
  });

  it("imports a .txt file as an editable document owned by the importer", async () => {
    const res = await upload(CHARLIE, "[itest] import.txt", "Hello world\nsecond line\n\nNew paragraph");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "[itest] import", ownerName: "Charlie" });
    const read = await call(CHARLIE, `/api/documents/${res.body.id}`);
    expect(read.body.content.content).toHaveLength(2);
    expect(read.body.content.content[0].content.map((n: Json) => n.type)).toEqual(["text", "hardBreak", "text"]);
    expect((await call(ALICE, `/api/documents/${res.body.id}`)).status).toBe(403);
  });

  it("rejects bad uploads with helpful messages", async () => {
    expect((await upload(ALICE, "[itest] a.pdf", "text")).body.error).toMatch(/\.txt/);
    expect((await upload(ALICE, "[itest] a.txt", "")).body.error).toMatch(/empty/);
    expect((await upload(ALICE, "[itest] a.txt", new Uint8Array(1024 * 1024 + 1).fill(65))).body.error).toMatch(/1 MB/);
    expect((await upload(ALICE, "[itest] a.txt", new Uint8Array([0xff, 0xfe, 0x41]))).body.error).toMatch(/UTF-8/);
    expect((await upload(ALICE, "[itest] a.txt", "ab\0cd")).body.error).toMatch(/binary/);
    expect((await call(ALICE, "/api/documents/import", { method: "POST", json: {} })).status).toBe(400);
  });
});
