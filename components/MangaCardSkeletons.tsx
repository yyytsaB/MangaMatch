import { POSTER_GRID, cn } from "@/lib/ui";

/** Placeholder posters that mirror the real poster grid, so nothing shifts. */
export default function MangaCardSkeletons({ count = 10, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(POSTER_GRID, className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-hairline bg-shelf">
          <div className="aspect-[2/3] w-full bg-elevated motion-safe:animate-pulse" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 rounded bg-elevated motion-safe:animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-elevated motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
