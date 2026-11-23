import Link from "next/link";
import { CategoryDot } from "@/components/CategoryChip";
import CoverImage from "@/components/CoverImage";
import StatusBadge from "@/components/StatusBadge";
import { StarIcon, TrashIcon } from "@/components/Icons";
import { CARD_FOCUS } from "@/components/library/LibraryGrid";
import { parseList } from "@/lib/manga";
import type { SavedManga } from "@/lib/types";
import { COUNT, ICON_BUTTON, cn } from "@/lib/ui";

export default function LibraryList({
  manga,
  onRemove,
}: {
  manga: SavedManga[];
  onRemove: (manga: SavedManga) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {manga.map((m) => (
        <li
          key={m.id}
          className={cn(
            "group relative flex items-center rounded-lg border border-hairline bg-shelf transition-[border-color,background-color] duration-150 ease-snap hover:border-hairline-strong hover:bg-elevated/40",
            CARD_FOCUS
          )}
        >
          <Link href={`/library/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-2 pr-14 focus-visible:outline-none">
            <div className="h-[60px] w-10 shrink-0 overflow-hidden rounded-md bg-ink">
              <CoverImage src={m.coverUrl} alt={m.title} decorative />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-[0.9375rem] font-semibold text-paper">{m.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusBadge status={m.readingStatus} />
                {m.rating !== null && (
                  <span className={cn(COUNT, "inline-flex items-center gap-1 text-brass")}>
                    <StarIcon size={11} fill="currentColor" strokeWidth={0} />
                    {m.rating}/10
                  </span>
                )}
                <span className="hidden truncate text-xs text-slate sm:inline">
                  {parseList(m.genres).slice(0, 3).join(" · ")}
                </span>
                {m.categories.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 text-xs text-slate">
                    <CategoryDot color={c.color} />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => onRemove(m)}
            aria-label={`Remove ${m.title} from library`}
            className={cn(ICON_BUTTON, "absolute right-2 hover:bg-danger/10 hover:text-danger")}
          >
            <TrashIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}
