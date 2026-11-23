import Link from "next/link";
import CategoryChip from "@/components/CategoryChip";
import CoverImage from "@/components/CoverImage";
import StatusBadge from "@/components/StatusBadge";
import { StarIcon, TrashIcon } from "@/components/Icons";
import { parseList } from "@/lib/manga";
import type { SavedManga } from "@/lib/types";
import { ICON_BUTTON, POSTER_GRID, cn } from "@/lib/ui";

/** Card focus ring drawn on the card itself, since the cover clips overflow. */
export const CARD_FOCUS =
  "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brass";

/** Remove control: always visible on touch, revealed on hover/focus for fine pointers. */
export const REVEAL_ON_HOVER =
  "fine:opacity-0 fine:group-hover:opacity-100 fine:group-has-[a:focus-visible]:opacity-100 focus-visible:opacity-100";

export function RatingBadge({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-brass/40 bg-ink/85 px-2 py-0.5 font-mono text-[10px] font-medium text-brass tabular-nums",
        className
      )}
    >
      <StarIcon size={11} fill="currentColor" strokeWidth={0} />
      {rating}
    </span>
  );
}

export default function LibraryGrid({
  manga,
  onRemove,
}: {
  manga: SavedManga[];
  onRemove: (manga: SavedManga) => void;
}) {
  return (
    <ul className={POSTER_GRID}>
      {manga.map((m) => (
        <li key={m.id}>
          <LibraryPosterCard manga={m} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  );
}

function LibraryPosterCard({ manga, onRemove }: { manga: SavedManga; onRemove: (manga: SavedManga) => void }) {
  const genres = parseList(manga.genres);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-hairline bg-shelf transition-[border-color] duration-150 ease-snap hover:border-hairline-strong",
        CARD_FOCUS
      )}
    >
      <Link href={`/library/${manga.id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-ink">
          <CoverImage
            src={manga.coverUrl}
            alt={manga.title}
            decorative
            imgClassName="transition-transform duration-200 ease-snap motion-safe:fine:group-hover:scale-[1.03]"
          />
          <span className="absolute top-2 left-2 rounded-full bg-ink/85">
            <StatusBadge status={manga.readingStatus} />
          </span>
          {manga.rating !== null && <RatingBadge rating={manga.rating} className="absolute top-2 right-2" />}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3 pr-12">
          <h3 className="line-clamp-2 font-display text-[0.9375rem] leading-[1.35] font-semibold tracking-[-0.01em] text-paper">
            {manga.title}
          </h3>
          {genres.length > 0 && <p className="truncate text-xs text-slate">{genres.slice(0, 2).join(" · ")}</p>}
          {manga.categories.length > 0 && (
            <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-1">
              <CategoryChip
                name={manga.categories[0].name}
                color={manga.categories[0].color}
                className="min-w-0 px-2 text-[11px]"
              />
              {manga.categories.length > 1 && (
                <span
                  className="shrink-0 font-mono text-[11px] text-muted tabular-nums"
                  title={manga.categories.slice(1).map((c) => c.name).join(", ")}
                >
                  +{manga.categories.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onRemove(manga)}
        aria-label={`Remove ${manga.title} from library`}
        className={cn(ICON_BUTTON, "absolute right-1.5 bottom-1.5 hover:bg-danger/10 hover:text-danger", REVEAL_ON_HOVER)}
      >
        <TrashIcon />
      </button>
    </article>
  );
}
