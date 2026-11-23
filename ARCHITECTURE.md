# DocFlow architecture

## Overview

```
Browser (React client components, Tiptap)
   │  fetch JSON / multipart
   ▼
Next.js route handlers  app/api/**        ← identity, validation, permissions
   │  parameterized SQL (Neon HTTP driver)
   ▼
Neon PostgreSQL: users · documents (content jsonb) · document_shares
```

## Frontend

- Next.js App Router. Pages are thin server components that render client components (`Dashboard`, `DocumentEditor`) which fetch from the API, so loading, empty and error states are explicit.
- Tiptap (`StarterKit`, with link/code/blockquote/etc. disabled) with `immediatelyRender: false` to avoid SSR hydration mismatch. The toolbar subscribes only to the active-state it displays.
- `lib/useAutosave.ts` holds the save logic: edits accumulate in a pending patch, a 1 s debounce triggers one PATCH at a time, failures restore the patch for retry, and `keepalive` flushes happen on tab hide/close and navigation.
- `/welcome` is a static page (no database row), so the onboarding content has no owner or permissions to get wrong.

## API (`app/api`)

| Route | Purpose |
|---|---|
| `GET/POST /api/session` | list demo users / switch user (sets httpOnly cookie) |
| `GET/POST /api/documents` | list owned + shared / create |
| `GET/PATCH /api/documents/:id` | read / update title and content |
| `GET/POST /api/documents/:id/shares` | owner-only: list access / grant access |
| `POST /api/documents/import` | multipart `.txt` → new document |

Every handler follows the same order: resolve the acting user from the cookie (`lib/auth.ts`) → validate input (`lib/validation.ts`, `lib/importText.ts`) → run a query that includes the access check (`lib/documents.ts`). `route()` in `lib/api.ts` turns thrown `ApiError`s into JSON errors (400/403/404/409) and hides unexpected errors behind a generic 500 (details only in server logs). Ownership is always taken from the resolved user, never from the request body.

## Database

- `users`, `documents` (`content jsonb` holds Tiptap JSON, `owner_id` FK), `document_shares` (`UNIQUE (document_id, user_id)`, cascading FKs).
- Access rule: owner, or a `document_shares` row. Updates put the check inside the `UPDATE ... WHERE` so there is no check-then-write gap; duplicate shares are rejected by `INSERT ... ON CONFLICT DO NOTHING` plus the unique constraint, so it is race-free.
- All queries use tagged templates (parameterized). `DATABASE_URL` is server-only.
- `db/schema.sql` and `db/seed.sql` are idempotent; `scripts/setup-db.ts` runs them.

## Data flows

**Editing:** Tiptap `onUpdate` → `queue({content})` → 1 s debounce → `PATCH /api/documents/:id` → validate content against an allowlist of nodes/marks → `UPDATE ... WHERE id AND (owner OR shared)` → status "Saved".

**Sharing:** owner opens Share dialog → `GET .../shares` (owner-only; returns who has access and who is still available) → `POST .../shares {userId}` → owner check, self-share check (400), user exists (404) → insert (409 if already shared). The shared user's list query joins `document_shares`, and the same access check applies to every later read/write. Shared users cannot call the shares endpoints (403).

**Importing:** browser sends the file as multipart → server checks extension and size (≤ 1 MB), strictly decodes UTF-8 (rejects invalid bytes and NULs), converts text to Tiptap JSON (blank line → paragraph, newline → hard break), validates it with the same content validator, and inserts a new document owned by the current user. The file itself is never stored.

## Technical choices

- **Route handlers instead of a separate backend:** one deployable, one language, native to Vercel.
- **Neon HTTP driver, no ORM:** works in serverless without connection pooling concerns; SQL stays small and readable.
- **JSONB for content:** Tiptap's native format, round-trips formatting exactly, and the server can validate it structurally.
- **Server-side validation allowlist:** the API only accepts the node/mark types the editor produces, so a crafted request can't store arbitrary structures. Import output uses only those types too.
- **Cookie-based mock identity:** explicitly permitted by the assessment and enough to exercise ownership/sharing rules end to end.

## Intentionally excluded

Real authentication, real-time collaboration (WebSockets/CRDT), version history, comments, PDF export, access revocation and document deletion, other import formats. Each adds significant surface area and none was required for a working, verifiable core.

## Limitations and future improvements

- Replace mock auth with a provider (e.g. Auth.js) and derive `getCurrentUser()` from a real session; add CSRF protection and rate limiting.
- Concurrency: add an `updated_at` / version check to PATCH to detect conflicting edits (currently last write wins); real-time collaboration would need a CRDT/OT layer.
- Sharing: revoke access, roles (viewer vs editor), invite by email.
- Import: Markdown/DOCX conversion; stream larger files.
- Add an end-to-end browser test suite to the repo (Playwright) once an extra dev dependency is acceptable.
