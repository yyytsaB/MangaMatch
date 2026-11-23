import { READING_STATUS_VALUES } from "@/lib/manga";
import {
  isPlainObject,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  parseHexColor,
  parseHttpUrl,
  parseId,
  parseOptionalInteger,
  parseOptionalNumber,
  parsePublicationDate,
  parseString,
  parseStringArray,
} from "@/lib/validation";

const MAX_BACKUP_ITEMS = 1000;

function optionalField<T>(value: unknown, parse: (input: unknown) => T | null) {
  return value == null ? null : parse(value) ?? undefined;
}

function parseCommaList(value: unknown) {
  if (typeof value !== "string" || value.length > MAX_TEXT_LENGTH) return null;
  const parts = parseStringArray(value.split(","), MAX_TITLE_LENGTH);
  return parts?.map((part) => part.trim()).filter(Boolean).join(",") ?? null;
}

function parseManga(value: unknown) {
  if (!isPlainObject(value)) return null;
  const anilistId = typeof value.anilistId === "number" ? parseId(value.anilistId) : null;
  const title = parseString(value.title, MAX_TITLE_LENGTH);
  const readingStatus = optionalField(value.readingStatus, (status) =>
    typeof status === "string" && READING_STATUS_VALUES.includes(status) ? status : null
  );
  const rating = optionalField(value.rating, (input) => {
    const parsed = parseOptionalInteger(input);
    return parsed !== null && parsed >= 1 && parsed <= 10 ? parsed : null;
  });

  const genres = optionalField(value.genres, parseCommaList);
  const authors = optionalField(value.authors, parseCommaList);
  const coverUrl = optionalField(value.coverUrl, parseHttpUrl);
  const siteUrl = optionalField(value.siteUrl, parseHttpUrl);
  const synopsis = optionalField(value.synopsis, (input) => parseString(input, MAX_TEXT_LENGTH));
  const publicationStatus = optionalField(value.publicationStatus, (input) => parseString(input, MAX_TITLE_LENGTH));
  const publishedFrom = optionalField(value.publishedFrom === "Unknown" ? null : value.publishedFrom, parsePublicationDate);
  const publishedTo = optionalField(value.publishedTo === "Unknown" ? null : value.publishedTo, parsePublicationDate);
  const chapters = optionalField(value.chapters, parseOptionalInteger);
  const volumes = optionalField(value.volumes, parseOptionalInteger);
  const malScore = optionalField(value.malScore, parseOptionalNumber);
  const categoryNames = parseStringArray(value.categories, MAX_TITLE_LENGTH)?.map((name) => name.trim());

  if (!anilistId || !title || readingStatus === undefined || rating === undefined ||
      genres === undefined || authors === undefined || coverUrl === undefined ||
      siteUrl === undefined || synopsis === undefined || publicationStatus === undefined ||
      publishedFrom === undefined || publishedTo === undefined || chapters === undefined ||
      volumes === undefined || malScore === undefined || !categoryNames || categoryNames.includes("")) {
    return null;
  }

  return {
    anilistId, title, genres, authors, coverUrl, siteUrl, synopsis, publicationStatus,
    readingStatus, rating: value.rating === undefined ? undefined : rating,
    publishedFrom, publishedTo, chapters, volumes, malScore, categoryNames,
  };
}

export function parseLibraryBackup(body: Record<string, unknown> & { library: unknown[] }) {
  const { library, categories = [], mode = "merge" } = body;
  if (mode !== "merge" && mode !== "replace") return null;
  if (library.length > MAX_BACKUP_ITEMS || !Array.isArray(categories) || categories.length > MAX_BACKUP_ITEMS) {
    return null;
  }

  const colorsByName = new Map<string, string | undefined>();
  for (const category of categories) {
    if (!isPlainObject(category)) return null;
    const name = parseString(category.name, MAX_TITLE_LENGTH);
    const color = optionalField(category.color, parseHexColor);
    if (!name || color === undefined) return null;
    colorsByName.set(name, color ?? colorsByName.get(name));
  }

  const manga = [];
  for (const entry of library) {
    const item = parseManga(entry);
    if (!item) return null;
    for (const name of item.categoryNames) {
      if (!colorsByName.has(name)) colorsByName.set(name, undefined);
    }
    if (colorsByName.size > MAX_BACKUP_ITEMS) return null;
    manga.push(item);
  }

  return { mode, manga, colorsByName };
}
