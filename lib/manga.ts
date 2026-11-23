// Domain constants and helpers shared by the API routes and the UI.

export const READING_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
] as const;

export const READING_STATUS_VALUES: string[] = READING_STATUSES.map(
  (s) => s.value
);

export type ReadingStatus = (typeof READING_STATUSES)[number]["value"];

/** Splits a comma-separated column (genres, authors) into a clean list. */
export function parseList(value: string | null | undefined): string[] {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

/**
 * Coarse franchise identity for a title, so spin-offs, sequel arcs, and
 * numbered entries collapse together ("Umineko … Episode 8: …",
 * "Ace of the Diamond Act II", "Jujutsu Kaisen 0"). Used to keep one title
 * per franchise in hidden-gem pools; a rare false merge only drops a
 * candidate, never invents one.
 */
const ARTICLES = ["the", "a", "an"];

function titleWords(text: string): string[] {
  const words = text.replace(/(\s\d+)+$/, "").trim().split(/\s+/).filter(Boolean);
  return ARTICLES.includes(words[0]) && words.length > 1 ? words.slice(1) : words;
}

export function franchiseKey(title: string): string {
  const segments = title.toLowerCase().split(/[:：(]| - /);
  // "Re:Zero", "Re:Monster": a tiny prefix isn't the franchise on its own.
  const head = /^\s*\S{1,3}\s*$/.test(segments[0]) && segments.length > 1
    ? `${segments[0]} ${segments[1]}`
    : segments[0];
  const normalized = head.replace(/[^\p{L}\p{N}]+/gu, " ");
  // Strip "Episode 8", "Act II", "Season 2"… unless that leaves only an
  // article behind ("The Act of Killing").
  const stripped = titleWords(normalized.replace(/\s(episode|part|act|season|arc|volume|vol|chapter)\b.*$/, ""));
  const words = stripped.length > 0 && !ARTICLES.includes(stripped[0]) ? stripped : titleWords(normalized);
  return words.slice(0, 3).join(" ") || title.toLowerCase().trim();
}

/** Returns a new Set with `item` added if absent, removed if present. */
export function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}
