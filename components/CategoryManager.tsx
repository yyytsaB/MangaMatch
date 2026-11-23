"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TogglePill from "@/components/TogglePill";
import { CategoryDot } from "@/components/CategoryChip";
import { PlusIcon } from "@/components/Icons";
import { createCategory, fetchCategories, setMangaCategory } from "@/lib/api-client";
import type { Category } from "@/lib/types";
import { CATEGORY_COLORS, INPUT, LABEL, buttonClass, cn } from "@/lib/ui";

export default function CategoryManager({
  mangaId,
  assigned,
}: {
  mangaId: number;
  assigned: Category[];
}) {
  const router = useRouter();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories().then(setAllCategories).catch(() => setAllCategories([]));
  }, []);

  const assignedIds = new Set(assigned.map((c) => c.id));

  async function toggleCategory(category: Category) {
    setBusyId(category.id);
    setToggleError(null);
    try {
      await setMangaCategory(mangaId, category.id, assignedIds.has(category.id));
      router.refresh();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Couldn’t update that category.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);

    try {
      const { hex: color } = CATEGORY_COLORS[allCategories.length % CATEGORY_COLORS.length];
      const category = await createCategory(name, color);
      setAllCategories((prev) => [...prev, category]);
      setNewName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create that category.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <p className={cn("mb-2.5", LABEL)}>Categories</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {allCategories.map((cat) => (
          <TogglePill
            key={cat.id}
            active={assignedIds.has(cat.id)}
            onClick={() => toggleCategory(cat)}
            disabled={busyId === cat.id}
          >
            <CategoryDot color={cat.color} />
            {cat.name}
          </TogglePill>
        ))}
        {allCategories.length === 0 && <p className="text-sm text-slate">No categories yet — create one below.</p>}
      </div>
      {toggleError && (
        <p role="alert" className="-mt-2 mb-4 text-sm text-danger">
          {toggleError}
        </p>
      )}

      <form onSubmit={handleCreateCategory} className="flex gap-2">
        <label htmlFor={`new-category-${mangaId}`} className="sr-only">
          New category name
        </label>
        <input
          id={`new-category-${mangaId}`}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          maxLength={60}
          className={INPUT}
        />
        <button type="submit" disabled={creating || !newName.trim()} className={buttonClass("secondary", "md")}>
          <PlusIcon />
          Add
        </button>
      </form>
      {createError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {createError}
        </p>
      )}
    </div>
  );
}
