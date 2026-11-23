// Shapes returned by this app's own API, shared by the client pages.
import type { MangaResult } from "@/lib/anilist";

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface SavedManga {
  id: number;
  anilistId: number;
  title: string;
  genres: string;
  coverUrl: string | null;
  synopsis: string | null;
  publicationStatus: string | null;
  readingStatus: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  publishedFrom: string | null;
  categories: Category[];
  siteUrl: string | null;
}

/** A ranked recommendation: a real catalogue entry plus why it fits. */
export interface Recommendation extends MangaResult {
  synopsis: string;
  reason: string;
}
