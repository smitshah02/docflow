# AI workflow

I used AI tools throughout this project. This note gives specific examples of where they helped and where I corrected them, not a full account of every interaction. Each example can be traced to the repository, its commit history, or my development session.

## Tools and roles

- **ChatGPT:** requirements analysis, planning, and technical review. It helped me identify the minimum viable feature set, choose a practical stack, break the work into phases, write the instructions for Claude Code, and review the results Claude Code reported. It also helped me plan the fix for the welcome document's incorrect sharing behavior.
- **Claude Code:** implementation, debugging, and testing. I worked with it phase by phase, and it ran lint, type checks, builds, and tests as it went.

## Where AI helped (examples)

1. **Rich-text editor.** Claude Code did the Tiptap integration: the toolbar (bold, italic, underline, headings 1 to 3, bullet and numbered lists), SSR-safe setup for Next.js, and storing the editor's JSON in PostgreSQL. It also wrote the debounced autosave with save-status, retry, and flush-on-navigation behavior.
2. **Validation and debugging.** It helped write the server-side validation (ids, titles, an allowlist of editor content types, `.txt` size, type, and UTF-8 checks), the error handling that returns clear messages without exposing database errors, and fixes for the problems listed below.
3. **Document sharing.** It helped implement the sharing endpoints and the permission logic: owner-only sharing, no duplicate or self shares, and shared users who can edit but not re-share. I then checked the rules through tests and through manual use with the demo users.
4. **Testing.** It created the unit tests, the API integration tests that run against the live Neon database, and the Playwright browser tests.
5. **Documentation.** It helped organize the README, ARCHITECTURE, and submission documents from the code and test output, which I reviewed.

AI contributed to other parts of the code as well. I do not claim the project was built without it.

## Corrections and changes I made along the way

| What the AI produced | Problem | What changed | Evidence |
|---|---|---|---|
| The `create-next-app` scaffold set `cacheComponents` and `partialPrefetching` in `next.config.ts`. | Experimental caching mode that adds complexity this app doesn't need. | I had both flags removed. | `git show 2386ef5:next.config.ts` vs. current `next.config.ts` |
| Installing `vitest` failed with a peer-dependency conflict against the scaffold's `@types/node@^20`. | Version conflict. | Moved to `@types/node@^22`. | `git show 2386ef5:package.json` vs. current `package.json` |
| `scripts/setup-db.ts` used top-level `await`. | It failed when I ran `npm run db:setup`. I reported the error. | Wrapped the work in an async `main()` with error handling. | `scripts/setup-db.ts` |
| `db/seed.sql` created "Welcome to DocFlow" as a normal Alice-owned document shared with Bob. | I noticed in the UI that Bob saw it under "Shared With Me". It should be a default page for everyone. | I defined the intended behavior; it became a static read-only `/welcome` page, the seed only removes the old row, and a test guards against re-seeding it. | `app/welcome/page.tsx`, `db/seed.sql`, `lib/seed.test.ts` |
| An early version of `updateDocument` checked access in one query and wrote in a second. | A check-then-write gap. Claude Code caught this itself before any test ran. | Moved the access check into the `UPDATE ... WHERE` clause. | comment in `lib/documents.ts` |
| The integration test read `process.env.BASE_URL`. | Vitest sets that variable itself, so all 9 tests failed on the first run. | Renamed it `TEST_BASE_URL`. | `tests/api.integration.test.ts` |
| First Playwright run: 12 passed, 11 failed. | The failures were bugs in the test script (selectors, timing, a stale server), not in the app. | Fixed the script until all 23 passed. No application code changed. | Development session; the script is not in the repo |
| A check of `DATABASE_URL` printed part of the Neon hostname to the terminal. | It went against my instruction not to print the value. No password was shown. | Later checks reported counts only, and a scan found the password and host in no tracked file. | Development session |

I also decided not to start Docker for a local database (an in-process Postgres was used to check the SQL until Neon was available) and not to add Playwright as a project dependency.

## How I verified the work

- ESLint, `tsc --noEmit`, and `next build` pass.
- Automated tests: 17 unit tests, 10 API integration tests against Neon, and 23 browser tests. All three suites were run on a local production build, and the integration and browser suites were run again against the deployed site. Results are in `SUBMISSION.md`.
- Manual use: I ran the setup script and the app myself, including sharing between demo users, which is how I found the welcome-document problem.
- Not covered: other browsers, real mobile devices, accessibility tooling, and concurrent editing.

## Decisions that stayed mine

- The stack and the limits: no Express, Prisma, Docker, Redis, WebSockets, real-time collaboration, comments, version history, or PDF export.
- Scope and phasing: what each phase included and what was deferred.
- Architecture and validation choices: mock authentication documented as demo-only, owner-or-shared access enforced on the server, JSONB content with an allowlist.
- The correct behavior for the welcome document.
- Creating the Neon database, deploying to Vercel, and committing and pushing to GitHub. I told Claude Code not to commit, push, or deploy.
- Reviewing the results and the final submission.
