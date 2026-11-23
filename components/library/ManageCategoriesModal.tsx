"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { CategoryDot } from "@/components/CategoryChip";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import type { Category } from "@/lib/types";
import { CATEGORY_COLORS, ICON_BUTTON, INPUT, LABEL, buttonClass, cn } from "@/lib/ui";

export default function ManageCategoriesModal({
  open,
  categories,
  onClose,
  onCreate,
  onRequestDelete,
}: {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onRequestDelete: (category: Category) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage categories"
      description="Group titles your own way. Deleting a category untags it from every manga."
    >
      <CategoryEditor categories={categories} onCreate={onCreate} onRequestDelete={onRequestDelete} />
      <button type="button" onClick={onClose} className={cn(buttonClass("secondary", "md"), "mt-6 w-full")}>
        Done
      </button>
    </Modal>
  );
}

function CategoryEditor({
  categories,
  onCreate,
  onRequestDelete,
}: {
  categories: Category[];
  onCreate: (name: string, color: string) => Promise<void>;
  onRequestDelete: (category: Category) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length].hex);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(trimmed, color);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that category.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <ul className="scroll-quiet max-h-60 space-y-1.5 overflow-y-auto">
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-ink py-1.5 pr-1.5 pl-3.5"
          >
            <span className="flex min-w-0 items-center gap-2.5 text-sm text-paper">
              <CategoryDot color={cat.color} className="h-2.5 w-2.5" />
              <span className="truncate">{cat.name}</span>
            </span>
            <button
              type="button"
              onClick={() => onRequestDelete(cat)}
              aria-label={`Delete category ${cat.name}`}
              className={cn(ICON_BUTTON, "hover:bg-danger/10 hover:text-danger")}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
        {categories.length === 0 && <li className="py-3 text-center text-sm text-slate">No categories yet.</li>}
      </ul>

      <form onSubmit={handleCreate} className="space-y-3 border-t border-hairline pt-5">
        <label htmlFor="new-category-name" className={LABEL}>
          New category
        </label>
        <div className="flex gap-2">
          <input
            id="new-category-name"
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Comfort reads"
            className={INPUT}
          />
          <button type="submit" disabled={creating || !name.trim()} className={buttonClass("primary", "md")}>
            <PlusIcon />
            Add
          </button>
        </div>
        <div role="radiogroup" aria-label="Category colour" className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((swatch) => {
            const selected = swatch.hex === color;
            return (
              <button
                key={swatch.hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={swatch.name}
                onClick={() => setColor(swatch.hex)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border transition-[border-color,scale] duration-150 ease-snap motion-safe:active:scale-[0.97]",
                  selected ? "border-paper" : "border-transparent hover:border-hairline-strong"
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-ink" style={{ backgroundColor: swatch.hex }}>
                  {selected && <CheckIcon size={12} strokeWidth={2.5} />}
                </span>
              </button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
