# DocFlow

A lightweight Google-Docs-style document editor built for the Ajaia AI-Native Full Stack Developer Assessment.
Create and format documents in the browser, autosave to PostgreSQL, share with other demo users, and import `.txt` files.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Tiptap rich-text editor · Neon serverless PostgreSQL · Next.js route handlers · Vercel.

> **Demo only.** Sign-in is *mock authentication* (a user switcher). It is not secure and the public demo must not be used for sensitive or confidential content. See [Limitations](#known-limitations).

## Demo users

Pick a user from the **Demo user** menu (top right). Seeded users: **Alice**, **Bob**, **Charlie** (`alice@example.com`, …). Suggested walkthrough:

1. As Alice: create a document, format it, click **Share**, share it with Bob.
2. Switch to Bob: it appears under **Shared With Me**; open and edit it (Bob has no Share button).
3. Switch to Charlie: the document is not listed, and opening its URL shows "You don't have access".
4. Any user: **Import Document** with a `.txt` file; it opens as a new editable document.

## Core functionality

- Dashboard: **Getting started** (read-only welcome page), **Owned Documents**, **Shared With Me**, New Document, Import Document
- Editor: rename, bold / italic / underline, headings 1–3, bulleted and numbered lists
- Autosave (1 s debounce) with visible Saved / Unsaved / Saving / Save failed + Retry; pending edits are flushed when you navigate away or close the tab
- Sharing: owner picks a demo user in the **Share** dialog; shared users can open and edit but cannot share further; no duplicate or self shares
- Import: **only `.txt` files are supported** (UTF-8, max 1 MB). Blank lines become paragraphs, single newlines become line breaks. The file is not stored, only the resulting document.

## Local setup

Requires Node 20.9+ and a free [Neon](https://neon.tech) project.

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL to your Neon connection string
npm run db:setup               # creates tables and seeds Alice, Bob, Charlie (safe to re-run)
npm run dev                    # http://localhost:3000
```

`DATABASE_URL` is read only on the server (route handlers); it is never sent to the browser. Get it from the Neon dashboard → **Connect** → pooled connection string. `db:setup` runs `db/schema.sql` then `db/seed.sql`; both are idempotent. (Alternatively paste those two files into Neon's SQL Editor.)

## Testing

```bash
npm test                 # unit tests: validation, permissions, .txt import, seed-file guard
npm run lint
npm run typecheck
npm run build

# API integration tests against the REAL Neon database (needs .env.local).
# Start the app in another terminal first (npm run dev, or npm run build && npm start):
TEST_BASE_URL=http://localhost:3000 npm run test:integration
```

Integration tests create documents titled `[itest] …` and delete them afterwards. They cover create/rename/edit/persist, owner and shared-user access, 403/404/400 handling, sharing rules (duplicate, self, non-owner), and `.txt` import including rejected uploads.

Browser behaviour was checked with Playwright driving Chromium against a production build; that script is not part of the repository (no extra dependency). Manual checklist if you want to repeat it:

1. Create a document → rename it → type with every toolbar button → refresh: title and formatting persist.
2. Type, then immediately click **← Documents** and reopen: the last edit is there.
3. In DevTools → Network, set **Offline**, type: status shows *Save failed*. Go online, click **Retry**: *Saved*.
4. Alice shares with Bob → Bob edits → Charlie sees nothing and gets a clear error on the URL.
5. Import a `.txt` (works) and a `.pdf` (rejected with a message).
6. Narrow the window to ~375 px: no horizontal scrolling, toolbar still usable.

## Deploy to Vercel (free Hobby plan + Neon free tier)

1. Run `npm run db:setup` once against the Neon database the deployment will use (the same `.env.local` is fine).
2. Push the repo to GitHub, then in Vercel: **Add New → Project → Import** the repo. Framework preset (Next.js) is detected automatically; no build settings to change.
3. Under **Environment Variables** add `DATABASE_URL` (Production, Preview) with your Neon connection string, then **Deploy**.
4. Open the URL and run the demo walkthrough above.

No-Git alternative: `npx vercel login`, `npx vercel` (preview), `npx vercel env add DATABASE_URL production`, `npx vercel --prod`.

The only configuration is `DATABASE_URL`. The Neon driver talks to Postgres over HTTPS, so it works in Vercel's serverless functions without extra setup. Pick a Vercel function region close to your Neon region if you want lower latency.

## Known limitations

- **Mock authentication.** The user switcher stores a demo user id in an httpOnly cookie. Anyone can become any user; there are no passwords, no sessions, no rate limiting and no CSRF protection. Owner/shared permission checks are enforced server-side, but they trust that cookie. Replace `getCurrentUser()` in `lib/auth.ts` with a real auth provider before any real use. Do not put sensitive content in the public demo; anyone with the URL can read any user's documents by switching users.
- Last write wins; no real-time collaboration or conflict detection.
- Shared users are editors (content and title); only the owner can share.
- No revoking access, deleting documents, version history, comments or export.
- Import is `.txt` only; text is converted to plain paragraphs (no Markdown or other formats).
- Local `next build` may warn about a Turbopack root if there is a stray `package-lock.json` in a parent folder; it is harmless and does not occur on Vercel.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design.
