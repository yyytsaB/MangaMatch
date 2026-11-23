// External reader search links, built in one place so every card, detail
// page, and recommendation points at the same URLs.
export type Reader = "mangafire" | "comix";

export function readerUrl(reader: Reader, title: string): string {
  const query = encodeURIComponent(title);
  return reader === "mangafire"
    ? `https://mangafire.to/browse?keyword=${query}&sort=relevance:desc`
    : `https://comix.to/browse?q=${query}&sort=relevance%3Adesc`;
}
