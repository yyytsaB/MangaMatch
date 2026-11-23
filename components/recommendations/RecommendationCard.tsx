import Chip from "@/components/Chip";
import CoverImage from "@/components/CoverImage";
import StatusBadge from "@/components/StatusBadge";
import { BookOpenIcon, CheckIcon, ExternalLinkIcon, PlusIcon } from "@/components/Icons";
import { readerUrl } from "@/lib/reader-links";
import type { Recommendation } from "@/lib/types";
import { COUNT, LABEL, buttonClass, cn } from "@/lib/ui";

export default function RecommendationCard({
  rec,
  isAdded,
  onSave,
  onAlreadyRead,
}: {
  rec: Recommendation;
  isAdded: boolean;
  onSave: (rec: Recommendation) => void;
  onAlreadyRead: (rec: Recommendation) => void;
}) {
  return (
    <article className="flex gap-4 rounded-xl border border-hairline bg-shelf p-4 transition-[border-color] duration-150 ease-snap hover:border-hairline-strong sm:gap-5 sm:p-5">
      <div className="relative aspect-[2/3] w-24 shrink-0 self-start overflow-hidden rounded-lg border border-hairline bg-ink sm:w-32">
        <CoverImage src={rec.coverUrl ?? null} alt={rec.title} decorative />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-lg leading-tight font-semibold tracking-[-0.01em] text-paper">{rec.title}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {rec.status && <StatusBadge status={rec.status} />}
          {rec.chapters ? (
            <span className={cn(COUNT, "inline-flex items-center gap-1 text-slate")}>
              <BookOpenIcon size={12} />
              {rec.chapters} ch.
            </span>
          ) : null}
          {rec.genres.slice(0, 3).map((genre) => (
            <Chip key={genre} className="px-2 text-[11px]">
              {genre}
            </Chip>
          ))}
        </div>

        {rec.synopsis && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate">{rec.synopsis}</p>}

        <div className="mt-3 rounded-r-lg border-l-2 border-brass bg-brass/[0.06] px-3.5 py-2.5">
          <p className={cn(LABEL, "mb-1 text-brass")}>Why this matches you</p>
          <p className="text-sm leading-relaxed text-paper">{rec.reason}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={() => onSave(rec)}
            disabled={isAdded}
            aria-label={isAdded ? `${rec.title} is in your library` : `Save ${rec.title} to library`}
            className={cn(buttonClass(isAdded ? "secondary" : "primary", "sm"), "disabled:opacity-100")}
          >
            {isAdded ? <CheckIcon size={14} className="text-completed" /> : <PlusIcon size={14} />}
            {isAdded ? "In library" : "Save"}
          </button>
          <button type="button" onClick={() => onAlreadyRead(rec)} className={buttonClass("secondary", "sm")}>
            Already read
          </button>

          <div className="ml-auto flex items-center gap-1">
            <a
              href={readerUrl("mangafire", rec.title)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("ghost", "sm")}
            >
              MangaFire
              <ExternalLinkIcon size={12} />
            </a>
            {rec.siteUrl && (
              <a href={rec.siteUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
                Details
                <ExternalLinkIcon size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
