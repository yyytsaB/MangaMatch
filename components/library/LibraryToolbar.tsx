"use client";

import { FiltersIcon, GridIcon, ListIcon } from "@/components/Icons";
import { SORT_OPTIONS, type LibraryLayout, type LibrarySort } from "@/lib/library-view";
import { COUNT, buttonClass, cn } from "@/lib/ui";

export default function LibraryToolbar({
  shown,
  total,
  sort,
  layout,
  activeFilterCount,
  onSortChange,
  onLayoutChange,
  onOpenFilters,
}: {
  shown: number;
  total: number;
  sort: LibrarySort;
  layout: LibraryLayout;
  activeFilterCount: number;
  onSortChange: (sort: LibrarySort) => void;
  onLayoutChange: (layout: LibraryLayout) => void;
  onOpenFilters: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onOpenFilters} className={cn(buttonClass("secondary", "sm"), "lg:hidden")}>
        <FiltersIcon size={14} />
        Filters
        {activeFilterCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brass px-1 font-mono text-[10px] text-ink tabular-nums">
            {activeFilterCount}
          </span>
        )}
      </button>

      <p className="order-last basis-full text-sm text-slate sm:order-none sm:mr-auto sm:basis-auto" aria-live="polite">
        <span className={cn(COUNT, "text-sm text-paper")}>{shown}</span>
        {shown === total ? (total === 1 ? " title" : " titles") : ` of ${total} ${total === 1 ? "title" : "titles"}`}
      </p>

      <select
        aria-label="Sort by"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as LibrarySort)}
        className="ml-auto h-8 min-w-0 rounded-lg sm:ml-0 border border-hairline bg-shelf px-2.5 text-sm text-paper transition-[border-color] duration-150 ease-snap hover:border-hairline-strong focus:border-brass/70 focus-visible:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-shelf">
            {opt.label}
          </option>
        ))}
      </select>

      <div className="flex rounded-lg border border-hairline bg-shelf p-0.5" role="group" aria-label="Layout">
        <LayoutButton label="Grid view" active={layout === "grid"} onClick={() => onLayoutChange("grid")}>
          <GridIcon size={14} />
        </LayoutButton>
        <LayoutButton label="List view" active={layout === "list"} onClick={() => onLayoutChange("list")}>
          <ListIcon size={14} />
        </LayoutButton>
      </div>
    </div>
  );
}

function LayoutButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-7 w-8 items-center justify-center rounded-md transition-[background-color,color] duration-150 ease-snap",
        active ? "bg-elevated text-brass" : "text-slate hover:text-paper"
      )}
    >
      {children}
    </button>
  );
}
