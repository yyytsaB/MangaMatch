"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import TogglePill from "@/components/TogglePill";
import { CategoryDot } from "@/components/CategoryChip";
import type { MangaResult } from "@/lib/anilist";
import type { Category } from "@/lib/types";
import { LABEL, buttonClass, cn } from "@/lib/ui";

/** Confirms an add and lets the reader tag it with one category. */
export default function AddToLibraryModal({
  manga,
  categories,
  saving,
  onCancel,
  onConfirm,
}: {
  manga: MangaResult | null;
  categories: Category[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: (categoryId: number | null) => void;
}) {
  return (
    <Modal
      open={manga !== null}
      onClose={onCancel}
      dismissible={!saving}
      size="sm"
      title="Add to library"
      description={manga ? `“${manga.title}” will be saved as Planning.` : undefined}
    >
      <CategoryPicker categories={categories} saving={saving} onCancel={onCancel} onConfirm={onConfirm} />
    </Modal>
  );
}

function CategoryPicker({
  categories,
  saving,
  onCancel,
  onConfirm,
}: {
  categories: Category[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: (categoryId: number | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-6">
          <p className={cn("mb-2", LABEL)}>Category (optional)</p>
          <div className="flex flex-wrap gap-1.5">
            <TogglePill active={selectedId === null} onClick={() => setSelectedId(null)}>
              None
            </TogglePill>
            {categories.map((cat) => (
              <TogglePill key={cat.id} active={selectedId === cat.id} onClick={() => setSelectedId(cat.id)}>
                <CategoryDot color={cat.color} />
                {cat.name}
              </TogglePill>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className={cn(buttonClass("secondary", "md"), "flex-1")}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(selectedId)}
          disabled={saving}
          className={cn(buttonClass("primary", "md"), "flex-1")}
        >
          {saving ? "Saving…" : "Save to library"}
        </button>
      </div>
    </>
  );
}
