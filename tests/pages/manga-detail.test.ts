import { beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: { manga: { findUnique: lookup, findFirst: lookup } },
}));
vi.mock("next/headers", () => ({
  cookies: async () => new Map([["mangamatch_session", { value: "reader-a" }]]),
}));

const { default: MangaDetailPage } = await import("@/app/library/[id]/page");

function renderDetail(id: string) {
  return MangaDetailPage({ params: Promise.resolve({ id }) });
}

describe("manga detail page", () => {
  beforeEach(() => {
    lookup.mockReset();
  });

  it("returns not found for an invalid id before querying the library", async () => {
    await expect(renderDetail("invalid")).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("offers a one-click Find similar link anchored on this title", async () => {
    lookup.mockResolvedValue({
      id: 7, title: "Monster", genres: "Mystery", authors: null, coverUrl: null, synopsis: null,
      publicationStatus: "FINISHED", readingStatus: "completed", rating: 10, publishedFrom: null,
      publishedTo: null, chapters: 162, volumes: 18, malScore: 8.9, siteUrl: null, categories: [],
    });

    const hrefs: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object" || !("props" in node)) return;
      const props = (node as { props: { href?: unknown; children?: unknown } }).props;
      if (typeof props.href === "string") hrefs.push(props.href);
      walk(props.children);
    };
    walk(await renderDetail("7"));

    expect(hrefs).toContain("/recommendations?similarTo=7");
  });

  it("returns not found for a title outside the current library", async () => {
    lookup.mockImplementation(async ({ where }) =>
      where.sessionId === "reader-a" ? null : { id: 7, title: "Private title" }
    );
    await expect(renderDetail("7").then(() => "rendered")).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404"
    );
  });
});
