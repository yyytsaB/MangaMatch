"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateManga } from "@/lib/api-client";
import { READING_STATUSES } from "@/lib/manga";
import { LABEL, cn } from "@/lib/ui";

export default function ReadingStatusEditor({
  mangaId,
  currentStatus,
}: {
  mangaId: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [busy, setBusy] = useState(false);

  async function updateStatus(value: string) {
    if (value === status) return;
    setBusy(true);
    setStatus(value); // optimistic

    try {
      await updateManga(mangaId, { readingStatus: value });
      router.refresh();
    } catch {
      setStatus(currentStatus); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p id={`status-${mangaId}`} className={cn("mb-2.5", LABEL)}>Reading status</p>
      <div
        role="group"
        aria-labelledby={`status-${mangaId}`}
        className="grid grid-cols-3 gap-1 rounded-lg border border-hairline bg-ink p-1"
      >
        {READING_STATUSES.map((s) => {
          const active = status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={active}
              onClick={() => updateStatus(s.value)}
              disabled={busy}
              className={cn(
                "h-8 rounded-md text-sm transition-[background-color,color] duration-150 ease-snap disabled:opacity-60",
                active ? "bg-elevated text-paper" : "text-slate hover:text-paper"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
