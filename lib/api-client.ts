// Typed wrappers around this app's API routes, so the URL, method and
// payload shape of each endpoint is defined in exactly one place.
import { fetchJson, jsonRequest } from "@/lib/http";
import type { ReadingStatus } from "@/lib/manga";
import type { Category, SavedManga } from "@/lib/types";
import type { MangaResult } from "@/lib/anilist";

export async function fetchLibrary(): Promise<SavedManga[]> {
  const data = await fetchJson<{ manga: SavedManga[] }>("/api/manga/list");
  return data.manga ?? [];
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await fetchJson<{ categories: Category[] }>("/api/categories");
  return data.categories ?? [];
}

export async function createCategory(name: string, color?: string): Promise<Category> {
  const data = await fetchJson<{ category: Category }>(
    "/api/categories",
    jsonRequest("POST", color ? { name, color } : { name })
  );
  return data.category;
}

export function deleteCategory(categoryId: number): Promise<unknown> {
  return fetchJson("/api/categories/" + categoryId, { method: "DELETE" });
}

export function updateManga(
  mangaId: number,
  patch: { readingStatus?: string; rating?: number | null }
): Promise<unknown> {
  return fetchJson(`/api/manga/${mangaId}`, jsonRequest("PATCH", patch));
}

export function deleteManga(mangaId: number): Promise<unknown> {
  return fetchJson(`/api/manga/${mangaId}`, { method: "DELETE" });
}

export function setMangaCategory(
  mangaId: number,
  categoryId: number,
  assigned: boolean
): Promise<unknown> {
  return fetchJson(
    `/api/manga/${mangaId}/categories`,
    jsonRequest(assigned ? "DELETE" : "POST", { categoryId })
  );
}

export async function addMangaToLibrary(
  manga: MangaResult,
  readingStatus?: ReadingStatus
): Promise<SavedManga> {
  const data = await fetchJson<{ manga: SavedManga }>(
    "/api/manga/add",
    jsonRequest("POST", { ...manga, readingStatus })
  );
  return data.manga;
}

/** Never suggest this title to the session again. */
export function dismissManga(anilistId: number, title?: string): Promise<unknown> {
  return fetchJson("/api/dismissed", jsonRequest("POST", { anilistId, title }));
}

export interface DismissedTitle {
  anilistId: number;
  title: string | null;
  createdAt: string;
}

export async function fetchDismissed(): Promise<DismissedTitle[]> {
  const data = await fetchJson<{ dismissed: DismissedTitle[] }>("/api/dismissed");
  return data.dismissed ?? [];
}

export function undismissManga(anilistId: number): Promise<unknown> {
  return fetchJson("/api/dismissed", jsonRequest("DELETE", { anilistId }));
}

export interface ImportResult {
  success: boolean;
  mode: "merge" | "replace";
  importedCount: number;
  updatedCount: number;
  totalProcessed: number;
  createdCategoriesCount: number;
}

export async function exportLibrary(): Promise<void> {
  const response = await fetch("/api/manga/export");
  if (!response.ok) {
    throw new Error("Failed to export library");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = `mangamatch-library-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function importLibrary(
  jsonData: unknown,
  mode: "merge" | "replace" = "merge"
): Promise<ImportResult> {
  const payload = typeof jsonData === "object" && jsonData !== null
    ? { ...(jsonData as Record<string, unknown>), mode }
    : { library: [], mode };

  return fetchJson<ImportResult>(
    "/api/manga/import",
    jsonRequest("POST", payload)
  );
}
