"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateManga } from "@/lib/api-client";
import { COUNT, LABEL, cn } from "@/lib/ui";

export default function RatingEditor({
  mangaId,
  currentRating,
}: {
  mangaId: number;
  currentRating: number | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(currentRating);
  const [busy, setBusy] = useState(false);

  async function updateRating(value: number) {
    const newValue = value === rating ? null : value;
    setBusy(true);
    setRating(newValue);

    try {
      await updateManga(mangaId, { rating: newValue });
      router.refresh();
    } catch {
      setRating(currentRating);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p id={`rating-${mangaId}`} className={cn("mb-2.5 flex items-center justify-between", LABEL)}>
        <span>Your rating</span>
        <span className={cn(COUNT, rating !== null ? "text-brass" : "text-muted")}>
          {rating !== null ? `${rating}/10` : "Unrated"}
        </span>
      </p>
      <div role="group" aria-labelledby={`rating-${mangaId}`} className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const filled = rating !== null && n <= rating;
          return (
            <button
              key={n}
              type="button"
              onClick={() => updateRating(n)}
              disabled={busy}
              aria-pressed={rating === n}
              aria-label={`Rate ${n} out of 10`}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg border font-mono text-xs tabular-nums",
                "transition-[background-color,border-color,color,scale] duration-150 ease-snap motion-safe:active:scale-[0.97] disabled:opacity-60",
                filled
                  ? "border-brass/50 bg-brass/15 text-brass"
                  : "border-hairline bg-ink text-slate hover:border-hairline-strong hover:text-paper"
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
