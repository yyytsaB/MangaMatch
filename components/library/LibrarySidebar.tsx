"use client";

import { CategoryDot } from "@/components/CategoryChip";
import { DownloadIcon, PencilIcon, SearchIcon, UploadIcon, XIcon } from "@/components/Icons";
import type { LibraryFacets, LibraryStatusFilter, LibraryViewState } from "@/lib/library-view";
import { COUNT, ICON_BUTTON, INPUT, LABEL, buttonClass, cn, filterRowClass } from "@/lib/ui";

const STATUS_ROWS: { value: LibraryStatusFilter; label: string; dot?: string }[] = [
  { value: "all", label: "All manga" },
  { value: "reading", label: "Reading", dot: "bg-reading" },
  { value: "planning", label: "Planning", dot: "bg-planning" },
  { value: "completed", label: "Completed", dot: "bg-completed" },
];

export interface LibrarySidebarProps {
  view: LibraryViewState;
  facets: LibraryFacets;
  filtersActive: boolean;
  exporting: boolean;
  canExport: boolean;
  onChange: (patch: Partial<LibraryViewState>) => void;
  onReset: () => void;
  onManageCategories: () => void;
  onExport: () => void;
  onImport: () => void;
}

/** Filter + backup controls; rendered in the desktop rail and the mobile drawer. */
export default function LibrarySidebar({
  view,
  facets,
  filtersActive,
  exporting,
  canExport,
  onChange,
  onReset,
  onManageCategories,
  onExport,
  onImport,
}: LibrarySidebarProps) {
  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={view.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search your library"
          aria-label="Search your library"
          className={cn(INPUT, "pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden")}
        />
        {view.q && (
          <button
            type="button"
            onClick={() => onChange({ q: "" })}
            aria-label="Clear search"
            className={cn(ICON_BUTTON, "absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2")}
          >
            <XIcon />
          </button>
        )}
      </div>

      <FilterSection title="Status">
        {STATUS_ROWS.map((row) => (
          <FilterRow
            key={row.value}
            active={view.status === row.value}
            count={facets.statusCounts[row.value]}
            onClick={() => onChange({ status: row.value })}
          >
            {row.dot ? <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", row.dot)} /> : null}
            {row.label}
          </FilterRow>
        ))}
      </FilterSection>

      <FilterSection
        title="Categories"
        action={
          <button type="button" onClick={onManageCategories} className={buttonClass("ghost", "sm")}>
            <PencilIcon size={14} />
            Manage
          </button>
        }
      >
        {facets.categories.length === 0 ? (
          <p className="px-3 text-sm text-muted">No tagged manga yet.</p>
        ) : (
          <>
            <FilterRow active={view.category === null} count={facets.statusCounts.all} onClick={() => onChange({ category: null })}>
              All categories
            </FilterRow>
            {facets.categories.map((cat) => (
              <FilterRow
                key={cat.name}
                active={view.category === cat.name}
                count={cat.count}
                onClick={() => onChange({ category: cat.name })}
              >
                <CategoryDot color={cat.color} />
                <span className="truncate">{cat.name}</span>
              </FilterRow>
            ))}
          </>
        )}
      </FilterSection>

      {facets.genres.length > 0 && (
        <FilterSection title="Genres">
          <div className="scroll-quiet -mr-1 max-h-60 space-y-0.5 overflow-y-auto pr-1">
            <FilterRow active={view.genre === null} count={facets.statusCounts.all} onClick={() => onChange({ genre: null })}>
              All genres
            </FilterRow>
            {facets.genres.map((genre) => (
              <FilterRow
                key={genre.name}
                active={view.genre === genre.name}
                count={genre.count}
                onClick={() => onChange({ genre: genre.name })}
              >
                <span className="truncate">{genre.name}</span>
              </FilterRow>
            ))}
          </div>
        </FilterSection>
      )}

      {filtersActive && (
        <button type="button" onClick={onReset} className={cn(buttonClass("secondary", "sm"), "w-full")}>
          Reset all filters
        </button>
      )}

      <FilterSection title="Backup">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={exporting || !canExport}
            className={cn(buttonClass("secondary", "sm"), "w-full")}
          >
            <DownloadIcon size={14} />
            {exporting ? "Exporting…" : "Export"}
          </button>
          <button type="button" onClick={onImport} className={cn(buttonClass("secondary", "sm"), "w-full")}>
            <UploadIcon size={14} />
            Import
          </button>
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex min-h-8 items-center justify-between pl-3">
        <h2 className={LABEL}>{title}</h2>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function FilterRow({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={filterRowClass(active)}>
      <span className="flex min-w-0 items-center gap-2">{children}</span>
      <span className={cn(COUNT, active ? "text-brass" : "text-muted")}>{count}</span>
    </button>
  );
}
