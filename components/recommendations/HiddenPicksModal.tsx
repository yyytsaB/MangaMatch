"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { RefreshIcon } from "@/components/Icons";
import { fetchDismissed, undismissManga, type DismissedTitle } from "@/lib/api-client";
import { buttonClass, cn } from "@/lib/ui";

/** Titles marked "Not interested", each restorable to future picks. */
export default function HiddenPicksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hidden picks"
      description="These won’t be suggested again. Restore one to let it back into your recommendations."
    >
      <HiddenList />
      <button type="button" onClick={onClose} className={cn(buttonClass("secondary", "md"), "mt-6 w-full")}>
        Done
      </button>
    </Modal>
  );
}

function HiddenList() {
  const [items, setItems] = useState<DismissedTitle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchDismissed()
      .then((list) => active && setItems(list))
      .catch(() => active && setError("Couldn’t load hidden picks."));
    return () => {
      active = false;
    };
  }, []);

  async function restore(item: DismissedTitle) {
    setBusyId(item.anilistId);
    setError(null);
    try {
      await undismissManga(item.anilistId);
      setItems((prev) => (prev ?? []).filter((entry) => entry.anilistId !== item.anilistId));
    } catch {
      setError("Couldn’t restore that one. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (error && items === null) {
    return <p role="alert" className="text-sm text-danger">{error}</p>;
  }
  if (items === null) {
    return <p className="text-sm text-slate" aria-live="polite">Loading…</p>;
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline py-6 text-center text-sm text-slate">
          Nothing hidden yet.
        </p>
      ) : (
        <ul className="scroll-quiet max-h-72 space-y-1.5 overflow-y-auto">
          {items.map((item) => {
            const label = item.title ?? `Title #${item.anilistId}`;
            return (
              <li
                key={item.anilistId}
                className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-ink py-1.5 pr-1.5 pl-3.5"
              >
                <span className="truncate text-sm text-paper">{label}</span>
                <button
                  type="button"
                  onClick={() => restore(item)}
                  disabled={busyId === item.anilistId}
                  aria-label={`Restore ${label}`}
                  className={buttonClass("ghost", "sm")}
                >
                  <RefreshIcon size={14} />
                  Restore
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </>
  );
}
