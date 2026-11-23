"use client";

import TogglePill from "@/components/TogglePill";
import { ArrowRightIcon, SparklesIcon } from "@/components/Icons";
import { CHAPTER_LENGTH_OPTIONS, COMPLETION_STATUS_OPTIONS, CONTENT_RATING_OPTIONS } from "@/lib/filters";
import { GENRE_OPTIONS, THEME_OPTIONS } from "@/lib/genres";
import { MAX_TEXT_LENGTH } from "@/lib/validation";
import { LABEL, PANEL, buttonClass, cn } from "@/lib/ui";

export interface RecommendationFilters {
  genres: Set<string>;
  completionStatus: string;
  chapterLength: string;
  contentRating: string;
  customQuery: string;
}

export default function FilterStep({
  filters,
  loading,
  onToggleGenre,
  onClearGenres,
  onChange,
  onNext,
  onSkip,
}: {
  filters: RecommendationFilters;
  loading: boolean;
  onToggleGenre: (genre: string) => void;
  onClearGenres: () => void;
  onChange: (patch: Partial<Omit<RecommendationFilters, "genres">>) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
      <div className={cn(PANEL, "space-y-6 p-5 sm:p-6 lg:col-span-7")}>
        <PillGroup
          label="Genres"
          action={
            filters.genres.size > 0 && (
              <button type="button" onClick={onClearGenres} className={buttonClass("ghost", "sm")}>
                Clear ({filters.genres.size})
              </button>
            )
          }
        >
          {GENRE_OPTIONS.map((genre) => (
            <TogglePill key={genre} active={filters.genres.has(genre)} onClick={() => onToggleGenre(genre)}>
              {genre}
            </TogglePill>
          ))}
        </PillGroup>

        <div className="border-t border-hairline pt-6">
          <PillGroup label="Themes & tropes">
            {THEME_OPTIONS.map((theme) => (
              <TogglePill key={theme} active={filters.genres.has(theme)} onClick={() => onToggleGenre(theme)}>
                {theme}
              </TogglePill>
            ))}
          </PillGroup>
        </div>
      </div>

      <div className={cn(PANEL, "space-y-6 p-5 sm:p-6 lg:col-span-5")}>
        <OptionGroup
          label="Completion status"
          options={COMPLETION_STATUS_OPTIONS}
          value={filters.completionStatus}
          onChange={(completionStatus) => onChange({ completionStatus })}
        />
        <OptionGroup
          label="Length"
          options={CHAPTER_LENGTH_OPTIONS}
          value={filters.chapterLength}
          onChange={(chapterLength) => onChange({ chapterLength })}
        />
        <OptionGroup
          label="Content rating"
          options={CONTENT_RATING_OPTIONS}
          value={filters.contentRating}
          onChange={(contentRating) => onChange({ contentRating })}
        />

        <div className="border-t border-hairline pt-6">
          <label htmlFor="extra-preferences" className={cn("mb-2 block", LABEL)}>
            Extra preferences
          </label>
          <textarea
            id="extra-preferences"
            value={filters.customQuery}
            onChange={(e) => onChange({ customQuery: e.target.value })}
            maxLength={MAX_TEXT_LENGTH}
            placeholder="e.g. grounded martial arts, slow-burn romance, no harem tropes"
            rows={3}
            className="w-full resize-none rounded-lg border border-hairline bg-ink px-3.5 py-2.5 text-sm text-paper placeholder:text-muted transition-[border-color] duration-150 ease-snap hover:border-hairline-strong focus:border-brass/70 focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <button type="button" onClick={onNext} className={cn(buttonClass("primary", "lg"), "w-full")}>
            Next: pick favorites
            <ArrowRightIcon />
          </button>
          <button type="button" onClick={onSkip} disabled={loading} className={cn(buttonClass("secondary", "lg"), "w-full")}>
            <SparklesIcon />
            Skip &amp; recommend now
          </button>
        </div>
      </div>
    </div>
  );
}

function PillGroup({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-3 flex min-h-8 items-center justify-between">
        <h2 className={LABEL}>{label}</h2>
        {action}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label}>
      <h2 className={cn("mb-2.5", LABEL)}>{label}</h2>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <TogglePill key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
            {opt.label}
          </TogglePill>
        ))}
      </div>
    </div>
  );
}
