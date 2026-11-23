// Shared request-body validation helpers for the API routes.
// Everything reaching Prisma or the Gemini prompt is validated here so a
// malformed or hostile body can't be persisted or blown up into an
// unbounded upstream request.

export const MAX_TEXT_LENGTH = 5000;
export const MAX_TITLE_LENGTH = 500;
export const MAX_LIST_LENGTH = 50;
export const MAX_EXCLUDED_ANILIST_IDS = 500;
const MAX_DB_INTEGER = 2_147_483_647;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseId(value: unknown): number | null {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof id === "number" && Number.isInteger(id) && id > 0 && id <= MAX_DB_INTEGER
    ? id
    : null;
}

export function parseString(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

export function parseOptionalString(
  value: unknown,
  maxLength: number
): string | null {
  if (value === undefined || value === null) return null;
  return parseString(value, maxLength);
}

export function parseStringArray(
  value: unknown,
  maxLength: number,
  maxItems: number = MAX_LIST_LENGTH
): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length > maxLength) return null;
    out.push(item);
  }
  return out;
}

export function parseIntegerArray(value: unknown, maxItems = MAX_LIST_LENGTH): number[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const out: number[] = [];
  for (const item of value) {
    const id = parseId(item);
    if (id === null) return null;
    out.push(id);
  }
  return out;
}

export function parseOptionalInteger(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_DB_INTEGER
    ? value
    : null;
}

export function parseOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parsePublicationDate(value: unknown): string | null {
  const date = parseString(value, 32);
  if (!date) return null;
  const isIso = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!isIso && !/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(date)) return null;

  const time = new Date(isIso ? `${date}T00:00:00Z` : `${date} UTC`);
  if (!Number.isFinite(time.getTime())) return null;
  const iso = time.toISOString().slice(0, 10);
  if (isIso) return iso === date ? iso : null;

  const legacy = time.toLocaleDateString("en-US", {
    timeZone: "UTC", month: "long", day: "numeric", year: "numeric",
  });
  return legacy === date ? iso : null;
}

// Only http(s) URLs are stored — a `javascript:` or `data:` URL saved here
// would later be rendered straight into an anchor/image in the library UI.
export function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function parseHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return HEX_COLOR.test(value) ? value : null;
}

export async function readJsonBody(
  req: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return isPlainObject(body) ? body : null;
  } catch {
    return null;
  }
}
