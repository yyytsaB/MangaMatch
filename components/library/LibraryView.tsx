"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import MangaCardSkeletons from "@/components/MangaCardSkeletons";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import Toast, { useToast } from "@/components/Toast";
import { LibraryIcon, PlusIcon, SearchIcon, SparklesIcon } from "@/components/Icons";
import ImportLibraryModal from "@/components/library/ImportLibraryModal";
import LibraryGrid from "@/components/library/LibraryGrid";
import LibraryList from "@/components/library/LibraryList";
import LibrarySidebar from "@/components/library/LibrarySidebar";
import LibraryToolbar from "@/components/library/LibraryToolbar";
import ManageCategoriesModal from "@/components/library/ManageCategoriesModal";
import {
  createCategory,
  deleteCategory,
  deleteManga,
  exportLibrary,
  fetchCategories,
  fetchLibrary,
  type ImportResult,
} from "@/lib/api-client";
import {
  DEFAULT_LIBRARY_VIEW,
  applyLibraryView,
  hasActiveFilters,
  libraryFacets,
  libraryViewQuery,
  parseLibraryView,
  rememberLibraryQuery,
  type LibraryViewState,
} from "@/lib/library-view";
import type { Category, SavedManga } from "@/lib/types";
import { CONTAINER, PANEL, buttonClass, cn } from "@/lib/ui";

export default function LibraryView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const [view, setView] = useState<LibraryViewState>(() => parseLibraryView(searchParams));
  // URL queries this view wrote itself and whose router echo hasn't arrived
  // yet, oldest first. A URL change that isn't one of our echoes came from
  // outside (e.g. the Library nav link), so the view follows it.
  const [urlSync, setUrlSync] = useState<{ seen: string; pending: string[] }>({ seen: urlQuery, pending: [] });

  if (urlQuery !== urlSync.seen) {
    const echo = urlSync.pending.indexOf(urlQuery);
    if (echo >= 0) {
      setUrlSync({ seen: urlQuery, pending: urlSync.pending.slice(echo + 1) });
    } else {
      setUrlSync({ seen: urlQuery, pending: [] });
      setView(parseLibraryView(searchParams));
    }
  }

  const [manga, setManga] = useState<SavedManga[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [removing, setRemoving] = useState<SavedManga | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [toast, showToast, clearToast] = useToast();

  useEffect(() => {
    rememberLibraryQuery(libraryViewQuery(parseLibraryView(new URLSearchParams(urlQuery))));
  }, [urlQuery]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // The list request seeds a brand-new session's starter shelf, so
        // categories are read only after it settles.
        const library = await fetchLibrary();
        if (!active) return;
        setManga(library);
        const sessionCategories = await fetchCategories().catch(() => []);
        if (active) setCategories(sessionCategories);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  function updateView(patch: Partial<LibraryViewState>) {
    const next = { ...view, ...patch };
    setView(next);
    const query = libraryViewQuery(next);
    rememberLibraryQuery(query);
    if (query === urlQuery) return;
    setUrlSync((prev) => ({ ...prev, pending: [...prev.pending, query].slice(-50) }));
    // Native history integrates with the Next.js router (no server round
    // trip) and keeps Back from a detail page on the same shelf.
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  function resetFilters() {
    updateView({ status: DEFAULT_LIBRARY_VIEW.status, genre: null, category: null, q: "" });
  }

  const facets = useMemo(() => libraryFacets(manga), [manga]);
  const visible = useMemo(() => applyLibraryView(manga, view), [manga, view]);
  const filtersActive = hasActiveFilters(view);
  const activeFilterCount = [view.status !== "all", view.genre, view.category, view.q.trim()].filter(Boolean).length;

  async function confirmRemove() {
    if (!removing) return;
    const { id, title } = removing;
    setRemoving(null);
    try {
      await deleteManga(id);
      setManga((prev) => prev.filter((m) => m.id !== id));
      showToast(`Removed “${title}” from your library`, "info");
    } catch {
      showToast("Couldn’t remove that manga. Try again.", "error");
    }
  }

  async function handleCreateCategory(name: string, color: string) {
    const category = await createCategory(name, color);
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function confirmDeleteCategory() {
    if (!deletingCategory) return;
    const { id, name } = deletingCategory;
    setDeletingCategory(null);
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setManga((prev) => prev.map((m) => ({ ...m, categories: m.categories.filter((c) => c.id !== id) })));
      if (view.category === name) updateView({ category: null });
      showToast(`Deleted category “${name}”`, "info");
    } catch {
      showToast("Couldn’t delete that category.", "error");
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportLibrary();
      showToast("Backup downloaded", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleImported(result: ImportResult) {
    setImportOpen(false);
    const summary = `Restored: ${result.importedCount} added, ${result.updatedCount} updated`;
    try {
      const [library, sessionCategories] = await Promise.all([fetchLibrary(), fetchCategories()]);
      setManga(library);
      setCategories(sessionCategories);
      showToast(summary, "success");
    } catch {
      showToast(`${summary}. Reload to see the changes.`, "info");
    }
  }

  const sidebar = (
    <LibrarySidebar
      view={view}
      facets={facets}
      filtersActive={filtersActive}
      exporting={exporting}
      canExport={manga.length > 0}
      onChange={updateView}
      onReset={resetFilters}
      onManageCategories={() => {
        setFiltersOpen(false);
        setManagingCategories(true);
      }}
      onExport={handleExport}
      onImport={() => {
        setFiltersOpen(false);
        setImportOpen(true);
      }}
    />
  );

  return (
    <div className={cn(CONTAINER, "py-8")}>
      <PageHeader
        eyebrow="Collection"
        meta={loading ? "Loading" : `${manga.length} ${manga.length === 1 ? "title" : "titles"}`}
        title="My Library"
        actions={
          <>
            <Link href="/search" className={buttonClass("primary", "md")}>
              <PlusIcon />
              Add manga
            </Link>
            <Link href="/recommendations" className={buttonClass("secondary", "md")}>
              <SparklesIcon />
              Recommendations
            </Link>
          </>
        }
      />

      <div className="flex items-start gap-8">
        <aside aria-label="Library filters" className={cn(PANEL, "sticky top-20 hidden w-64 shrink-0 p-3 lg:block")}>
          {sidebar}
        </aside>

        <div className="min-w-0 flex-1">
          <LibraryToolbar
            shown={visible.length}
            total={manga.length}
            sort={view.sort}
            layout={view.view}
            activeFilterCount={activeFilterCount}
            onSortChange={(sort) => updateView({ sort })}
            onLayoutChange={(layout) => updateView({ view: layout })}
            onOpenFilters={() => setFiltersOpen(true)}
          />

          {error && <ErrorBanner className="mb-6">{error}</ErrorBanner>}

          {loading ? (
            <MangaCardSkeletons count={10} />
          ) : (
            !error && (
              <div className="animate-enter">
                {manga.length === 0 ? (
                  <EmptyState
                    icon={<LibraryIcon size={20} />}
                    title="Your library is empty"
                    actions={
                      <>
                        <Link href="/search" className={buttonClass("primary", "md")}>
                          <SearchIcon />
                          Find manga
                        </Link>
                        <Link href="/recommendations" className={buttonClass("secondary", "md")}>
                          <SparklesIcon />
                          Get recommendations
                        </Link>
                      </>
                    }
                  >
                    Add manga from search or recommendations to start tracking what you read.
                  </EmptyState>
                ) : visible.length === 0 ? (
                  <EmptyState
                    title="Nothing matches these filters"
                    actions={
                      <button type="button" onClick={resetFilters} className={buttonClass("secondary", "md")}>
                        Clear filters
                      </button>
                    }
                  >
                    Try a different status, genre, or search term.
                  </EmptyState>
                ) : view.view === "grid" ? (
                  <LibraryGrid manga={visible} onRemove={setRemoving} />
                ) : (
                  <LibraryList manga={visible} onRemove={setRemoving} />
                )}
              </div>
            )
          )}
        </div>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        variant="sheet"
        initialFocus="dialog"
        title="Filters"
        footer={
          <button type="button" onClick={() => setFiltersOpen(false)} className={cn(buttonClass("primary", "md"), "w-full")}>
            Show {visible.length} {visible.length === 1 ? "title" : "titles"}
          </button>
        }
      >
        {sidebar}
      </Modal>

      <ManageCategoriesModal
        open={managingCategories}
        categories={categories}
        onClose={() => setManagingCategories(false)}
        onCreate={handleCreateCategory}
        onRequestDelete={setDeletingCategory}
      />

      <ImportLibraryModal open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />

      <ConfirmModal
        isOpen={removing !== null}
        title="Remove from library?"
        message={`“${removing?.title ?? ""}” will be removed along with your rating and status.`}
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />

      <ConfirmModal
        isOpen={deletingCategory !== null}
        title="Delete category?"
        message={`“${deletingCategory?.name ?? ""}” will be untagged from every manga.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeletingCategory(null)}
      />

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
