<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MangaMatch — Agent Guide

Personal manga library tracker and AniList-grounded AI recommendation web app.

- **Stack:** Next.js `16.2` (App Router + Turbopack), React `19`, TypeScript `5`, Tailwind CSS `v4`, Prisma `6` + SQLite (local) / Turso libSQL (Vercel), Vitest `3`.
- **Workflow & Slices:** Always check `ROADMAP.md` before starting work. Never implement a slice whose `Blocked by` FOG items are still unresolved.
- **Visual System:** All UI work must follow `DESIGN.md` (anti-slop rules, unified tokens, motion & accessibility floor).

## Commands & Verification Gates

Every change must leave all four gates green before completion:

```bash
npm test              # Vitest unit & API route suites
npx tsc --noEmit      # TypeScript strict check
npm run lint          # ESLint (Next.js + React 19 rules)
npm run build         # prisma generate && next build
```

> **Windows note:** If PowerShell execution policy blocks `.ps1` shims (`npm.ps1`), run `npm.cmd` and `npx.cmd` instead.

## Codebase Map

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Landing page + recently added strip (Server Component) |
| `app/library/page.tsx` | Personal library, filters, sorting, category management, JSON import/export |
| `app/library/[id]/page.tsx` | Manga detail page (Server Component + interactive editors) |
| `app/search/page.tsx` | AniList search + Trending / Popular / Top Rated browse tabs |
| `app/recommendations/page.tsx` | 3-step recommendation wizard & showcase |
| `app/api/manga/**` | CRUD, search, trending, export, import, category assignment |
| `app/api/categories/**` | Category list, create, delete |
| `app/api/recommend/route.ts` | Candidate pool assembly + Gemini reranking |
| `lib/anilist.ts` | AniList GraphQL queries, retries, candidate pool builder |
| `lib/gemini.ts` | Ranking prompt builder, Gemini API client, response parser |
| `lib/db.ts` | Prisma singleton (local SQLite vs Turso libSQL adapter) |
| `lib/session.ts` & `lib/http.ts` | Anonymous session extraction (`x-session-id` / cookie) & client fetch wrapper |
| `lib/validation.ts` | Shared request body/URL/ID/array validation helpers |
| `lib/starter-data.ts` | Initial starter pack seeding for new sessions |
| `lib/ui.ts` & `app/globals.css` | Shared Tailwind style recipes, theme tokens, animations |
| `prisma/schema.prisma` | `Manga` and `Category` models scoped by `sessionId` |
| `tests/` | Vitest suites for `lib/` and `app/api/` (network & Prisma mocked) |

## Hard Engineering Invariants

1. **Session Isolation Everywhere:** Every Prisma query or mutation on `Manga` or `Category` — including Server Component pages (e.g. `app/library/[id]/page.tsx`) and relation updates (e.g. connecting a `categoryId` to a `mangaId`) — MUST verify that **all referenced records belong to the caller's `sessionId`**. Never trust numeric IDs alone.
2. **Validate Every Write & Query Boundary:** Every mutating API route (`POST`, `PATCH`, `DELETE`) and `/api/recommend` MUST parse JSON via `readJsonBody()` and validate inputs with `lib/validation.ts` (`parseId`, `parseHttpUrl` for external URLs, enum checks, string/array length caps). Never persist unvalidated `req.json()` properties.
3. **Canonical Data Formats:**
   - Dates (`publishedFrom`, `publishedTo`) are stored as ISO `YYYY-MM-DD` (or `null`), never human-readable date strings.
   - Comma-separated lists (`genres`, `authors`) must have items trimmed on write and trimmed in `parseList()`.
   - Library and recommendation deduplication uses numeric `anilistId`, not title string matching.
4. **Grounded Recommendations & External API Safety:**
   - Recommendations MUST come from real AniList candidates; Gemini only ranks and explains supplied indices and never invents titles.
   - Pass `GEMINI_API_KEY` via the `x-goog-api-key` header (never URL query params). Use structured JSON output (`responseMimeType: "application/json"` + `responseSchema`) instead of stripping markdown fences.
   - Bound all external `fetch()` calls (AniList, Gemini) with `AbortSignal.timeout()`.
5. **Zero Secrets in Git:** Never hardcode Turso URLs/tokens, API keys, or ad-hoc production maintenance scripts in tracked files. Keep `scratch/` gitignored.
6. **Red-Green TDD & Minimalism:**
   - For every bug fix and backend feature, write a failing Vitest test first, confirm it fails for the right reason, then implement the smallest clean fix.
   - Prefer native Web/Next.js/React APIs and existing helpers over new dependencies or speculative abstractions.
7. **UI Craft & Anti-Slop Floor (see `DESIGN.md` for full spec):**
   - No OS emojis in UI chrome, buttons, tabs, or badges — use one unified stroke SVG icon system.
   - No drifting background glow blobs, neon colored box-shadows, hover shimmer sweeps, or `transition-all`.
   - Never leak vendor/implementation jargon (`AniList GraphQL`, `Gemini AI`) into user-facing copy.
   - Every navigable card uses `<Link>` (never `<div onClick={() => router.push(...)}>`). Every modal has `role="dialog"`, `aria-modal="true"`, Escape & backdrop dismiss. No hover-only essential actions.

## Multi-Model Handoff Protocol

- **Planning / Architecture (Neon):** Maintains `AGENTS.md`, `ROADMAP.md`, and `DESIGN.md`.
- **Backend / Security / Data / TDD Slices (Codex):** Owns Prisma/Turso, API routes, validation, AniList/Gemini pipeline, and Vitest regression coverage. Keep diffs surgical; do not restyle unrelated UI.
- **UI Polish / Component Refactoring / E2E Slices (Claude):** Owns `DESIGN.md` execution, splitting monolithic client pages, a11y/motion polish, and Playwright E2E coverage.
- Always update completed checkboxes in `ROADMAP.md` at the end of a slice.
