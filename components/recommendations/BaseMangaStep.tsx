"use client";

import CoverImage from "@/components/CoverImage";
import EmptyState from "@/components/EmptyState";
import { ArrowLeftIcon, CheckIcon, SparklesIcon } from "@/components/Icons";
import type { SavedManga } from "@/lib/types";
import { COUNT, PANEL, POSTER_GRID, buttonClass, cn } from "@/lib/ui";

export default function BaseMangaStep({
  candidates,
  libraryIsEmpty,
  selectedIds,
  loading,
  onToggle,
  onBack,
  onSubmit,
}: {
  candidates: SavedManga[];
  libraryIsEmpty: boolean;
  selectedIds: Set<number>;
  loading: boolean;
  onToggle: (id: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className={cn(PANEL, "p-5 sm:p-6")}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-paper">Anchor on favorites</h2>
          <p className="mt-1 text-sm text-slate">
            Optional — pick titles you love and we&apos;ll lean toward their tone, depth, and pacing.
          </p>
        </div>
        {selectedIds.size > 0 && (
          <p className={cn(COUNT, "text-xs text-brass")}>
            {selectedIds.size} selected
          </p>
        )}
      </div>

      {candidates.length > 0 ? (
        <ul className={POSTER_GRID}>
          {candidates.map((m) => {
            const selected = selectedIds.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggle(m.id)}
                  className={cn(
                    "group relative flex w-full flex-col overflow-hidden rounded-xl border text-left transition-[border-color] duration-150 ease-snap",
                    selected ? "border-brass" : "border-hairline hover:border-hairline-strong"
                  )}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-ink">
                    <CoverImage
                      src={m.coverUrl}
                      alt={m.title}
                      decorative
                      imgClassName="transition-transform duration-200 ease-snap motion-safe:fine:group-hover:scale-[1.03]"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-150 ease-snap",
                        selected ? "border-brass bg-brass text-ink" : "border-paper/30 bg-ink/70 text-transparent"
                      )}
                    >
                      <CheckIcon size={14} strokeWidth={2.5} />
                    </span>
                  </div>
                  <span className={cn("line-clamp-2 p-3 text-sm font-medium", selected ? "text-paper" : "text-slate")}>
                    {m.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState>
          {libraryIsEmpty
            ? "Your library is empty, so we’ll go on your preferences alone."
            : "None of your saved manga match the selected genres. You can still continue."}
        </EmptyState>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-hairline pt-5 sm:flex-row sm:justify-between">
        <button type="button" onClick={onBack} className={buttonClass("secondary", "lg")}>
          <ArrowLeftIcon />
          Back
        </button>
        <button type="button" onClick={onSubmit} disabled={loading} className={buttonClass("primary", "lg")}>
          <SparklesIcon />
          {loading ? "Finding…" : "Find recommendations"}
        </button>
      </div>
    </div>
  );
}
