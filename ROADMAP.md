# MangaMatch — Roadmap & Vertical Slices

> **Baseline (audited 2026-11-23):** 114/114 Vitest tests passing · `tsc --noEmit` passing · `npm run lint` failing (18 errors, 7 warnings; missing from CI) · Live Turso credentials currently exposed in tracked `scratch/` scripts.

## Model Routing Strategy

- **Neon (Planning & Design Contracts):** Audits codebase, clears FOG decisions, maintains `AGENTS.md`, `ROADMAP.md`, and `DESIGN.md`.
- **Codex (Slices 0, 1, and backend parts of Slice 3):** Security hardening, Prisma/Turso alignment, API validation, AniList/Gemini recommendation pipeline, and strict Red-Green Vitest TDD.
- **Claude (Slice 2 and UI parts of Slice 3):** Executing `DESIGN.md` anti-slop UI polish, decomposing monolithic React pages, accessibility/motion engineering, and Playwright E2E smoke tests.

---

## CLEAR — Ordered Vertical Slices

### Slice 0: Security, Hygiene & CI Gates
**Owner:** Codex *(after User completes manual token rotation)* · **Blocked by:** None

- [x] **[USER MANUAL]** Revoke/rotate the exposed Turso auth token (`turso db tokens invalidate`) leaked in `scratch/*-turso*.mjs` and update Vercel environment variables.
- [x] Delete tracked `scratch/` scripts from git and add `/scratch` to `.gitignore`.
- [x] Add `npm run lint` to `.github/workflows/ci.yml` and fix all 18 ESLint errors + 7 warnings (including React 19 synchronous `setState` in `app/search/page.tsx:65`).
- [x] Align `@prisma/adapter-libsql` with `@prisma/client` (`6.x`) in `package.json`, and reconcile `prisma/migrations/` with `prisma/schema.prisma` (`sessionId` columns & compound uniques).
- [x] **Security fixes (write failing tests first):**
  - [x] Scope `app/library/[id]/page.tsx` by `sessionId` and guard `parseId(id)` (return `notFound()` instead of 500 on invalid IDs).
  - [x] Verify `categoryId` belongs to `sessionId` in `app/api/manga/[id]/categories/route.ts` (close cross-session IDOR).
  - [x] Route `app/api/manga/import/route.ts` through `lib/validation.ts` (`parseHttpUrl`, `READING_STATUS_VALUES`, rating bounds, max item cap, preserve category `color`, clean up orphaned categories on `replace` mode).
  - [x] Route `app/api/recommend/route.ts` through `readJsonBody` + `lib/validation.ts` (400 on malformed JSON, bounded `customQuery`/`excludeTitles`/`genres`/`baseMangaIds`).
  - [x] Move `GEMINI_API_KEY` from query string to `x-goog-api-key` header in `lib/gemini.ts`.
  - [x] *(Found in review)* `getSessionId()` swallowed Next.js prerender bailouts, so `/` was statically prerendered with the `"default"` session for every visitor; now rethrows via `unstable_rethrow` (`/` is dynamic again).

**Exit Gate:** `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass; zero credentials in tracked files.

---

### Slice 1: Core Bug Fixes & Recommender Hardening (Red-Green TDD)
**Owner:** Codex · **Blocked by:** Slice 0

Write failing Vitest regression tests for each item before implementing:

- [x] **Fix base-manga community recs being sliced off** (`app/api/recommend/route.ts:74-116`): interleave or prioritize `getMediaRecommendations()` candidates at the front of the pool before slicing to 25.
- [x] **Include chapter counts in Gemini candidate rows** (`lib/gemini.ts:95-101`) so the prompt's chapter-length instruction actually works.
- [x] **Wire `contentRating` cleanly (resolved via `FOG-1`):** keep `isAdult: false` on all AniList queries (never pure adult/Hentai); `"safe"` excludes `Ecchi` & `Hentai`; `"any"` is unrestricted non-adult; `"mature"` targets borderline/Ecchi manga (ensure Ecchi candidates are queried/prioritized in `getCandidatePool` & prompt while still excluding `Hentai` / `isAdult: true`).
- [x] **Fix "Yes, Add as Completed" saving as `"planning"`** (`app/api/manga/add/route.ts` + `app/recommendations/page.tsx:169-196`): accept validated optional `readingStatus` on add (default `"planning"`) and pass `"completed"` from the Already Read modal.
- [x] **Preserve full metadata when saving recommendations** (`app/api/recommend/route.ts:138-149` + `app/recommendations/page.tsx:137-151`): include `authors`, `publishedFrom`, `publishedTo`, `volumes`, and `score` in recommendation responses and pass them to `addMangaToLibrary()`.
- [x] **Fix starter-pack data drift & sorting bugs:**
  - [x] Trim items in `parseList()` (`lib/manga.ts`) and normalize `lib/starter-data.ts` genres (`"Action,Fantasy"`) and dates (ISO `YYYY-MM-DD`).
  - [x] Sort `year-newest` / `year-oldest` by parsed date/timestamp rather than raw `.localeCompare()`.
- [x] **Fix session bootstrap & starter-pack resurrection:**
  - [x] Establish a single consistent session cookie on first visit so `/` (SSR) and `/library` (client) never split into `"default"` vs UUID.
  - [x] Prevent `seedStarterLibraryIfEmpty()` from re-seeding after a user intentionally deletes all manga, and make seeding concurrency-safe (idempotent upsert/guard).
- [x] **Sync `/search` with saved library** (`app/search/page.tsx:38`): pre-populate `addedIds` from the user's library on mount; deduplicate exclusions in `/api/recommend` by `anilistId` rather than title string.
- [x] **API reliability & test speed:**
  - [x] Upgrade `lib/gemini.ts` to Gemini structured JSON output (`responseMimeType: "application/json"` + `responseSchema`).
  - [x] Add `AbortSignal.timeout()` to AniList & Gemini `fetch()` calls, plus short TTL caching on AniList browse/search endpoints.
  - [x] Use `vi.useFakeTimers()` in `tests/lib/anilist.test.ts` so the test suite runs in ~1s instead of sleeping real retry delays.

**Exit Gate:** Every bug has a regression test; all 4 CI gates green.

---

### Slice 2: Anti-Slop UI Polish, Design System Alignment & Modularization
**Owner:** Claude · **Blocked by:** Slice 1

Execute `DESIGN.md` (approved via `FOG-2`) systematically across the app:

- [x] **Tokens & Anti-Slop Cleanup:**
  - [x] Define canonical CSS custom properties and Tailwind `@theme` tokens in `app/globals.css` and simplify `lib/ui.ts`.
  - [x] Remove `components/AmbientBackground.tsx` drifting glow blobs, hero stacked glows, card shimmer sweeps, neon colored box-shadows, and `backdrop-blur-xl` on near-opaque surfaces.
  - [x] Replace all UI emojis (`✨`, `⚙️`, `🏷️`, `🔥`, `⭐`, `📥`, `📤`, `📚`, `🎭`, `🎯`, `📖`, `📁`, `⚡`, `🔍`, `🏆`) with one unified 16px stroke SVG icon set.
  - [x] Rewrite vendor-leaking UI copy (`"AniList GraphQL"`, `"Gemini AI"`, `"Why Gemini picks this"`) into natural product copy (`"Why this matches you"`, `"Extra preferences"`, `"Find recommendations"`).
- [x] **Layout & Visual Consistency:**
  - [x] Standardize container width to `max-w-7xl` across `Nav.tsx` and every page route.
  - [x] Unify page headers (`PageHeader`), border radii (`rounded-xl` cards/panels, `rounded-lg` inputs/list items, `rounded-full` pills/buttons), and `1px` borders.
  - [x] Render actual stored `category.color` on category chips and filter pills instead of hardcoded blue/gold.
  - [x] Match `MangaCardSkeletons` grid columns (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5`) to the real poster grids; remove invalid utility classes (`py-0.2`).
- [x] **Decompose Monolithic Pages:**
  - [x] Split `app/library/page.tsx` (964L) into `LibrarySidebar`, `LibraryToolbar`, `LibraryGrid`, `LibraryList`, `ManageCategoriesModal`, and `ImportLibraryModal`.
  - [x] Split `app/recommendations/page.tsx` (713L) into `FilterStep`, `BaseMangaStep`, `RecommendationResults`, and `RecommendationCard`.
  - [x] Extract `MangaPosterCard` and `AddToLibraryModal` from `app/search/page.tsx` (486L).
- [x] **UX, Accessibility & Motion Craft:**
  - [x] Sync Library filters, search, sort, and view mode to URL search params so navigating back from `/library/[id]` preserves state.
  - [x] Convert `<div onClick={() => router.push(...)}>` cards to semantic `<Link>` elements.
  - [x] Upgrade `components/Modal.tsx` with `role="dialog"`, `aria-modal="true"`, Escape & backdrop close, and focus management; add mobile filter drawer on `/library` and responsive step bar on `/recommendations`.
  - [x] Make card quick-actions accessible on touch and keyboard focus (no hover-only controls); add `loading="lazy"` + `onError` fallback to `CoverImage`.
  - [x] Replace `transition-all duration-300` and 600ms entrance keyframes with targeted GPU transitions (`150-220ms`, `cubic-bezier(0.23, 1, 0.32, 1)`), `:active { scale(0.97) }`, `@media (hover: hover) and (pointer: fine)`, and complete `prefers-reduced-motion` handling.
- [x] **Verification & Docs:**
  - [x] Add a lean Playwright E2E smoke test covering the 4 core flows (Library filter/detail, Search → Add, Recommend → Save, Export/Import).
  - [x] Update `README.md` to match current architecture (Turso + sessions, real commands, accurate limitations).
  - [x] *(Found in review)* Modal focus trap leaked on Shift+Tab from a focused sheet; library view went stale on same-route navigation (Nav → Library while filtered); covers that failed before hydration never showed the title fallback; a failed category tag, toggle, or post-import refresh was reported as (or hid) a failure. All fixed with regression tests.
  - [x] *(Added)* Playwright smoke wired into CI (`npm run test:e2e` after the build; throwaway `prisma/e2e.db`, catalogue/ranking stubbed at the browser boundary). Page-flow regressions from Slice 1 ported from the hook-mock harness to Testing Library + jsdom.

**Exit Gate:** Desktop + mobile visual check matches `DESIGN.md`; lint, typecheck, Vitest, Playwright smoke, and production build all green.

---

### Slice 3: Feature Evolution (Post-Polish)
**Owner:** Codex (API/DB) + Claude (UI) · **Blocked by:** Slice 2 (and `FOG-4` for 3A)

Confirmed execution order (`3A → 3B → 3C → 3D`, locked via `FOG-3`):

- [ ] **Slice 3A — Smarter Recommendation Engine:** Auto-feed user's high-rated (8–10★) and low-rated (1–4★) titles as taste signals; real hidden-gems retrieval in `diverge` mode; persistent per-session `DismissedManga` table; 1-click *"Find Similar"* CTA on `/library/[id]`.
- [ ] **Slice 3B — Reading Progress & Notes:** Track `chaptersRead` with quick `+1` stepper on `"reading"` cards + personal notes field on detail page.
- [ ] **Slice 3C — Search Pagination & External Import:** Paginated Search/Browse + debounced search + AniList username library import.
- [ ] **Slice 3D — Optional Accounts:** Auth (Better Auth / Auth.js) with seamless "claim anonymous session library" migration.

---

## FOG — Open Decisions & Spikes

Resolve each item before starting the slice it blocks:

- [x] **`[DECISION] FOG-1` (Slice 1 — Resolved):** Keep `isAdult: false` everywhere (never literal adult/Hentai content). Wire `"mature"` specifically for borderline/Ecchi manga (prioritize/filter Ecchi candidates while still rejecting `Hentai`), `"safe"` to hide Ecchi/Hentai, and `"any"` for standard non-adult browsing.
- [x] **`[DECISION] FOG-2` (Slice 2 — Resolved):** Refine and elevate the existing **Midnight Ink (`#0B1220`) + Warm Brass (`#E8C77E`)** dark editorial palette as specified in `DESIGN.md`.
- [x] **`[DECISION] FOG-3` (Slice 3 — Resolved):** Execute Slice 3 in exact order: **`3A → 3B → 3C → 3D`**.
- [ ] **`[SPIKE] FOG-4` (Blocks Slice 3A):** Run a quick throwaway AniList GraphQL check on `sort: SCORE_DESC` with popularity bands / deeper pages to verify candidate quality for true Hidden Gems (`diverge: true`).

---

## DEFERRED — Parked Out of Scope

- Normalized `Genre` and `Author` relational join tables (trimmed comma strings are fast and simple well past 1,000 titles/session).
- Multi-LLM provider abstraction layer (stick to Gemini Flash until there is a concrete reason to swap).
- Self-hosted cover image proxy/cache (AniList CDN + client `loading="lazy"` + fallback is sufficient).
- Public social profiles, shared lists, or native mobile apps.
