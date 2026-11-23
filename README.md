<p align="center">
  <img src="public/logo.png" alt="MangaMatch Logo" width="500" />
</p>

##

MangaMatch is a personal manga tracker with grounded recommendations. Search or browse real catalogue data, keep a shelf of what you're reading, organise it with your own colour-coded categories, and get five picks at a time that are ranked against your taste — every pick is a real manga from [AniList](https://anilist.co/), never a title an AI made up.

No account needed: each browser gets an anonymous session, and a starter shelf is seeded on the first visit so there's something to explore.

## Features

- **Library** — poster grid or compact list, filters for reading status, category, and genre, in-library title search, and six sort orders. Filters, search, sort, and layout live in the URL, so Back from a title (or a shared link) returns to the exact same shelf. On phones the filters move into a slide-over drawer.
- **Title pages** — reading status, a 1–10 rating, colour-coded categories, publication metadata, synopsis, and quick links to online readers.
- **Search & browse** — title search plus Trending / Most popular / Top rated tabs with a genre filter. Titles already on your shelf show as *In library*.
- **Recommendations** — a three-step flow: pick genres, themes, completion status, length, content rating, and free-text extra preferences; optionally anchor on favourites from your library; then get five picks, each with a *Why this matches you* rationale. Save a pick, mark it as already read (saved as *Completed*), ask for more, or ask for something different.
- **Backup & restore** — export your library and categories as JSON, then import it later in *Merge & update* or *Replace library* mode.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, `proxy.ts` for session cookies) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 with design tokens in `app/globals.css` (see `DESIGN.md`) |
| Fonts | Space Grotesk (display), Inter (body), JetBrains Mono (labels) via `next/font/google` |
| Database | Prisma 6 — local SQLite in development, [Turso](https://turso.tech/) (libSQL) in production |
| Catalogue data | [AniList GraphQL API](https://docs.anilist.co/) (public, no key) |
| Ranking | [Gemini API](https://ai.google.dev/) (Flash) with structured JSON output |
| Testing | [Vitest](https://vitest.dev/) + Testing Library (unit, API route, and component suites), [Playwright](https://playwright.dev/) (E2E smoke) |
| CI | GitHub Actions — typecheck, Vitest, lint, build, Playwright (`.github/workflows/ci.yml`) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A free [Gemini API key](https://aistudio.google.com/apikey) (only needed for recommendations)

### Setup

1. Install dependencies (this also runs `prisma generate`):

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```bash
   GEMINI_API_KEY=your_key_here
   DATABASE_URL=file:./dev.db
   ```

   For production on Turso, set `DATABASE_URL=libsql://<your-db>.turso.io` and `TURSO_AUTH_TOKEN` in your host's environment instead. Never commit either value.

3. Create the local database:

   ```bash
   npx prisma migrate deploy
   ```

4. Start the dev server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

> **Windows:** if PowerShell blocks the `npm.ps1` / `npx.ps1` shims, use `npm.cmd` and `npx.cmd`.

### Quality gates

Every change should leave all of these green (CI runs the same steps):

```bash
npm test                          # Vitest: lib/, app/api/, components, and page flows
npx tsc --noEmit                  # strict typecheck
npm run lint -- --max-warnings=0  # ESLint (Next.js + React 19 rules)
npm run build                     # prisma generate && next build
npm run test:e2e                  # Playwright smoke (needs a build first)
```

The Playwright suite (`e2e/smoke.spec.ts`) covers the four core flows — library filter → detail → back, search → add, recommend → save, and export → import — plus the mobile filter drawer. It starts `next start` on port 3100 against a throwaway SQLite file (`prisma/e2e.db`, recreated each run) and stubs the catalogue and ranking endpoints in the browser, so it needs no API keys and never touches a remote database. Install the browser once with `npx playwright install chromium`.

## Project Structure

```
app/
  page.tsx                 landing page + recently added (server component)
  library/page.tsx         Suspense shell for the URL-driven library view
  library/[id]/page.tsx    title page (session-scoped server component)
  search/page.tsx          search + browse
  recommendations/page.tsx three-step recommendation flow
  api/                     manga CRUD, search/browse, export/import, categories, recommend
components/
  library/                 LibraryView, LibrarySidebar, LibraryToolbar, LibraryGrid, LibraryList,
                           ManageCategoriesModal, ImportLibraryModal, BackToLibraryLink
  search/                  MangaPosterCard, AddToLibraryModal
  recommendations/         StepIndicator, FilterStep, BaseMangaStep, RecommendationResults,
                           RecommendationCard
  Icons.tsx                the single 16px stroke icon set
  Modal.tsx                accessible dialog / sheet (focus trap, Escape, backdrop, focus restore)
  …                        PageHeader, CoverImage, Toast, ConfirmModal, StatusBadge, CategoryChip, editors
lib/
  anilist.ts               AniList queries, retries, candidate pool
  gemini.ts                ranking prompt, Gemini client, structured-output parsing
  library-view.ts          library URL state, filtering/sorting, facet counts
  session.ts, http.ts      anonymous session lookup, client fetch helper
  validation.ts            request validation shared by every write route
  ui.ts                    Tailwind recipes built on the design tokens
prisma/                    schema + migrations (Manga, Category, StarterLibrary — all session-scoped)
proxy.ts                   issues the session cookie on first visit
tests/                     Vitest suites (api/, lib/, components/, pages/)
e2e/                       Playwright smoke tests
```

## How Recommendations Work

1. `getCandidatePool()` (`lib/anilist.ts`) fetches real manga that match your filters. Content rating maps to AniList genres: *Safe* excludes Ecchi, *Mature* targets Ecchi, and adult/Hentai titles are always excluded.
2. If you anchored on favourites, AniList's community "readers also liked" recommendations for those titles go to the front of the pool.
3. Titles already in your library, and picks you've already seen, are excluded by AniList ID.
4. Gemini receives the numbered candidate list (with chapter counts and scores) and returns structured JSON selecting five by index, each with a short rationale. It can only rank what it was given.

## Known Limitations

- Anonymous sessions only: your library lives with the session cookie in one browser. Use **Export** to move it elsewhere (optional accounts are planned in `ROADMAP.md`).
- Search and browse show a single page of results.
- Content rating is genre-based (AniList's Ecchi/Hentai genres), not a per-chapter rating.
- Covers load straight from AniList's CDN (lazy-loaded, with a title fallback if one fails).
- Recommendations need a `GEMINI_API_KEY`; everything else works without one.
