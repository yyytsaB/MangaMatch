"use client";

import { useEffect, useState } from "react";
import type { MangaResult, BrowseSort } from "@/lib/anilist";
import PageHeader from "@/components/PageHeader";
import ErrorBanner from "@/components/ErrorBanner";
import EmptyState from "@/components/EmptyState";
import Toast, { useToast } from "@/components/Toast";
import TogglePill from "@/components/TogglePill";
import MangaCardSkeletons from "@/components/MangaCardSkeletons";
import MangaPosterCard from "@/components/search/MangaPosterCard";
import AddToLibraryModal from "@/components/search/AddToLibraryModal";
import { ArrowLeftIcon, AwardIcon, HeartIcon, SearchIcon, TrendingIcon, XIcon } from "@/components/Icons";
import { addMangaToLibrary, fetchCategories, fetchLibrary, setMangaCategory } from "@/lib/api-client";
import { fetchJson } from "@/lib/http";
import { BROWSE_GENRES } from "@/lib/genres";
import { toggleSetItem } from "@/lib/manga";
import type { Category } from "@/lib/types";
import { CONTAINER, ICON_BUTTON, INPUT, LABEL, POSTER_GRID, buttonClass, cn, pillClass } from "@/lib/ui";

const BROWSE_TABS: { value: BrowseSort; label: string; Icon: typeof TrendingIcon }[] = [
  { value: "trending", label: "Trending", Icon: TrendingIcon },
  { value: "popular", label: "Most popular", Icon: HeartIcon },
  { value: "top-rated", label: "Top rated", Icon: AwardIcon },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState<MangaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingManga, setPendingManga] = useState<MangaResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, showToast, clearToast] = useToast();

  useEffect(() => {
    let active = true;

    async function loadLibraryContext() {
      // The list request seeds a first-time session's starter shelf, so
      // categories are only read once it has settled.
      const library = await fetchLibrary().catch(() => []);
      if (!active) return;
      setAddedIds((previous) => new Set([...previous, ...library.map((manga) => manga.anilistId)]));

      const sessionCategories = await fetchCategories().catch(() => []);
      if (active) setCategories(sessionCategories);
    }

    void loadLibraryContext();
    return () => {
      active = false;
    };
  }, []);

  const [browseTab, setBrowseTab] = useState<BrowseSort>("trending");
  const [browseGenre, setBrowseGenre] = useState("All");
  const [browseCache, setBrowseCache] = useState<Record<string, MangaResult[]>>({});
  const [browseError, setBrowseError] = useState<string | null>(null);

  const browseKey = `${browseTab}-${browseGenre}`;
  const browseResults = browseCache[browseKey];
  const browseLoading = !browseResults && !browseError;

  useEffect(() => {
    if (browseResults) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ sort: browseTab });
    if (browseGenre !== "All") params.set("genre", browseGenre);

    fetchJson<{ results: MangaResult[] }>(`/api/manga/trending?${params.toString()}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setBrowseCache((prev) => ({ ...prev, [browseKey]: data.results ?? [] }));
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setBrowseError(err instanceof Error ? err.message : "Failed to load");
        }
      });

    return () => controller.abort();
  }, [browseKey, browseResults, browseTab, browseGenre]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSubmittedQuery(trimmed);

    try {
      const data = await fetchJson<{ results: MangaResult[] }>(`/api/manga/search?q=${encodeURIComponent(trimmed)}`);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function backToBrowse() {
    setQuery("");
    setSubmittedQuery("");
    setHasSearched(false);
    setResults([]);
    setError(null);
  }

  async function confirmAdd(categoryId: number | null) {
    if (!pendingManga) return;
    const manga = pendingManga;
    const targetId = manga.anilistId;

    setSaving(true);
    setAddedIds((prev) => new Set(prev).add(targetId));

    let saved;
    try {
      saved = await addMangaToLibrary(manga);
    } catch {
      setAddedIds((prev) => toggleSetItem(prev, targetId));
      showToast("Couldn’t add that manga. Try again.", "error");
      setSaving(false);
      setPendingManga(null);
      return;
    }

    try {
      if (categoryId && saved?.id) await setMangaCategory(saved.id, categoryId, false);
      showToast(`Added “${manga.title}” to your library`, "success");
    } catch {
      showToast(`Added “${manga.title}”, but the category couldn’t be applied`, "info");
    } finally {
      setSaving(false);
      setPendingManga(null);
    }
  }

  function renderGrid(list: MangaResult[]) {
    return (
      <ul className={POSTER_GRID}>
        {list.map((manga) => (
          <li key={manga.anilistId}>
            <MangaPosterCard manga={manga} isAdded={addedIds.has(manga.anilistId)} onAdd={setPendingManga} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn(CONTAINER, "py-8")}>
      <PageHeader
        eyebrow="Discover"
        title="Search & browse"
        description="Look up a title, or browse what readers are into right now. Add anything you want to track."
      />

      <form onSubmit={handleSearch} role="search" className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, e.g. Monster or Vinland Saga"
            aria-label="Search manga by title"
            className={cn(INPUT, "h-11 pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden")}
          />
          {query && (
            <button
              type="button"
              onClick={backToBrowse}
              aria-label="Clear search"
              className={cn(ICON_BUTTON, "absolute top-1/2 right-1 -translate-y-1/2")}
            >
              <XIcon />
            </button>
          )}
        </div>
        <button type="submit" disabled={loading || !query.trim()} className={buttonClass("primary", "lg")}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <ErrorBanner className="mb-6">{error}</ErrorBanner>}

      {hasSearched ? (
        <section aria-label="Search results">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-slate" aria-live="polite">
              {loading ? (
                "Searching…"
              ) : (
                <>
                  <span className="font-mono text-paper tabular-nums">{results.length}</span>{" "}
                  {results.length === 1 ? "result" : "results"} for{" "}
                  <span className="text-paper">“{submittedQuery}”</span>
                </>
              )}
            </p>
            <button type="button" onClick={backToBrowse} className={buttonClass("ghost", "sm")}>
              <ArrowLeftIcon size={14} />
              Back to browse
            </button>
          </div>

          {loading ? (
            <MangaCardSkeletons count={10} />
          ) : results.length > 0 ? (
            <div className="animate-enter">{renderGrid(results)}</div>
          ) : (
            !error && (
              <EmptyState icon={<SearchIcon size={20} />} title="No matches">
                Nothing matched “{submittedQuery}”. Check the spelling or try the original Japanese title.
              </EmptyState>
            )
          )}
        </section>
      ) : (
        <section aria-label="Browse">
          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Browse by">
            {BROWSE_TABS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={browseTab === value}
                onClick={() => {
                  if (value === browseTab) return;
                  setBrowseTab(value);
                  setBrowseError(null);
                }}
                className={cn(pillClass(browseTab === value), "h-9 px-4 text-sm")}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="mb-6 flex items-center gap-2">
            <span className={cn(LABEL, "hidden shrink-0 sm:inline")}>Genre</span>
            <div
              className="scroll-quiet -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
              role="group"
              aria-label="Genre"
            >
              {BROWSE_GENRES.map((genre) => (
                <TogglePill
                  key={genre}
                  active={browseGenre === genre}
                  onClick={() => {
                    if (genre === browseGenre) return;
                    setBrowseGenre(genre);
                    setBrowseError(null);
                  }}
                  className="h-8 shrink-0 px-3 text-xs"
                >
                  {genre}
                </TogglePill>
              ))}
            </div>
          </div>

          {browseError && <ErrorBanner className="mb-6">{browseError}</ErrorBanner>}

          {browseLoading ? (
            <MangaCardSkeletons count={10} />
          ) : browseResults && browseResults.length > 0 ? (
            renderGrid(browseResults)
          ) : (
            !browseError && (
              <EmptyState title="Nothing here yet">No manga found for this genre. Try another one.</EmptyState>
            )
          )}
        </section>
      )}

      <AddToLibraryModal
        manga={pendingManga}
        categories={categories}
        saving={saving}
        onCancel={() => setPendingManga(null)}
        onConfirm={confirmAdd}
      />

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
