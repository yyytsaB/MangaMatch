import CoverImage from "@/components/CoverImage";
import StatusBadge from "@/components/StatusBadge";
import { CheckIcon, ExternalLinkIcon, PlusIcon } from "@/components/Icons";
import { RatingBadge } from "@/components/library/LibraryGrid";
import type { MangaResult } from "@/lib/anilist";
import { readerUrl } from "@/lib/reader-links";
import { ICON_BUTTON, buttonClass, cn } from "@/lib/ui";

/** Search/browse result: cover, title, and always-visible actions. */
export default function MangaPosterCard({
  manga,
  isAdded,
  onAdd,
}: {
  manga: MangaResult;
  isAdded: boolean;
  onAdd: (manga: MangaResult) => void;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-hairline bg-shelf transition-[border-color] duration-150 ease-snap hover:border-hairline-strong">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-ink">
        <CoverImage
          src={manga.coverUrl}
          alt={manga.title}
          decorative
          imgClassName="transition-transform duration-200 ease-snap motion-safe:fine:group-hover:scale-[1.03]"
        />
        {manga.status && (
          <span className="absolute top-2 left-2 rounded-full bg-ink/85">
            <StatusBadge status={manga.status} />
          </span>
        )}
        {manga.score !== null && <RatingBadge rating={manga.score} className="absolute top-2 right-2" />}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-display text-[0.9375rem] leading-[1.35] font-semibold tracking-[-0.01em] text-paper">
          {manga.title}
        </h3>
        {manga.genres.length > 0 && (
          <p className="mt-1 truncate text-xs text-slate">{manga.genres.slice(0, 2).join(" · ")}</p>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-3">
          <button
            type="button"
            onClick={() => onAdd(manga)}
            disabled={isAdded}
            aria-label={isAdded ? `${manga.title} is in your library` : `Add ${manga.title} to library`}
            className={cn(buttonClass(isAdded ? "secondary" : "primary", "sm"), "flex-1 disabled:opacity-100")}
          >
            {isAdded ? <CheckIcon size={14} className="text-completed" /> : <PlusIcon size={14} />}
            {isAdded ? "In library" : "Add"}
          </button>
          <a
            href={readerUrl("mangafire", manga.title)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Read ${manga.title} on MangaFire (opens in a new tab)`}
            className={cn(ICON_BUTTON, "h-8 w-8 border-hairline")}
          >
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}
