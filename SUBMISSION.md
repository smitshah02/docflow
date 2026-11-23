# DocFlow: Ajaia AI-Native Full Stack Developer Assessment

## Overview

DocFlow is a lightweight collaborative document editor inspired by Google Docs. Users create and format documents in the browser, edits autosave to PostgreSQL, documents can be shared with other users, and `.txt` files can be imported as new documents.

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS, Tiptap, Neon PostgreSQL, Next.js route handlers, Vercel.

## Links

| Item | Link |
|---|---|
| Live deployment | https://docflow-plum.vercel.app (verified, see below) |
| GitHub repository | https://github.com/smitshah02/docflow (public, `main`) |
| Video walkthrough | **TODO: add the video link** |

## Demo users (mock authentication)

Use the **Demo user** menu at the top right: **Alice**, **Bob**, **Charlie**. This is a demo switcher, not real authentication. Do not store sensitive content in the public demo.

## Reviewer quick start (about 2 minutes)

1. Open the live URL (it starts as Alice). Click **Welcome to DocFlow** for a short guide.
2. As Alice: **+ New Document**, rename it, format some text, and watch the status go Unsaved → Saving → Saved. Refresh to confirm persistence.
3. Click **Share**, pick **Bob**, share.
4. Switch to **Bob**: the document is under **Shared With Me**. Open it and edit it. There is no Share button for Bob.
5. Switch to **Charlie**: the document is not listed; opening its URL shows "You don't have access to this document."
6. On the dashboard, **Import Document** with a `.txt` file; it opens as an editable document. (A `.pdf` is rejected with a message.)

## Implemented functionality

- Dashboard with Getting started, Owned Documents, and Shared With Me; empty, loading, and error states.
- Rich-text editor: rename, bold, italic, underline, headings 1 to 3, bulleted and numbered lists; content stored as JSONB.
- Debounced autosave with visible Saved / Unsaved / Saving / Save failed + Retry; pending edits flushed on navigation and tab close.
- Sharing: owner-only Share dialog; shared users can open and edit but cannot share further; duplicate and self-shares rejected.
- `.txt` import (UTF-8, max 1 MB); paragraphs and line breaks preserved; file not stored, only the resulting document.
- Server-side permission checks on every document API; input validation; generic 500s with no raw database errors.

## Local setup

```bash
git clone https://github.com/smitshah02/docflow.git && cd docflow
npm install
cp .env.example .env.local       # set DATABASE_URL to a Neon connection string
npm run db:setup                 # creates tables, seeds Alice, Bob, Charlie
npm run dev                      # http://localhost:3000
```

## Automated testing results

Verified when this document was prepared (commit `19ec16d`):

| Check | Result |
|---|---|
| ESLint | pass |
| TypeScript (`tsc --noEmit`) | pass |
| Production build (`next build`) | pass |
| Unit tests (`npm test`) | 17 passed (the 10 integration tests are skipped in this mode) |
| API integration tests against live Neon (`npm run test:integration`) | 10 passed, run against a local production build |
| Browser tests (Playwright, headless Chromium) | 23 passed, run against a local production build |
| Deployed-site verification (https://docflow-plum.vercel.app) | Integration tests: 10 passed. Browser tests: 23 passed. Both run against the live Vercel deployment and Neon. |

The browser suite is not part of the repository (it would add a dev dependency); the manual checklist is in the README. Not tested: other browsers, real mobile devices, accessibility tooling, a real tab-close flush, concurrent editing.

## Architecture summary

React client components call Next.js route handlers (`app/api`). Each handler resolves the demo user from a cookie, validates input, and runs a parameterized SQL query that already contains the owner-or-shared check, through the Neon HTTP driver. Tables: `users`, `documents` (content as JSONB), `document_shares` (unique per document and user). See `ARCHITECTURE.md`.

## Known limitations

- Mock authentication: anyone can switch to any user, so anyone with the URL can read any document. Permissions are enforced server-side but trust the cookie.
- Last write wins; no conflict detection or real-time collaboration.
- Shared users are editors; no viewer role.
- No revoking access, deleting documents, version history, comments, or export.
- Import is `.txt` only and produces plain paragraphs.

## Deliberately deprioritized

Real authentication, real-time collaboration, version history, comments, PDF export, access revocation, document deletion, and other import formats. Each adds significant scope and none was needed for a working, verified core within the time limit.

## With another 2 to 4 hours (proposed)

1. Real authentication (e.g. Auth.js) replacing the user switcher, plus rate limiting. (about 1 h)
2. Optimistic concurrency on saves (version check) with a conflict message. (about 30 min)
3. Revoke access and delete documents; a viewer role. (about 1 h)
4. Playwright suite and CI (lint, typecheck, tests) added to the repository. (about 45 min)
5. Markdown import and a Markdown or print-to-PDF export. (about 45 min)
