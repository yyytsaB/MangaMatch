// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecommendationsPage from "@/app/recommendations/page";
import SearchPage from "@/app/search/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const recommendation = {
  anilistId: 42, title: "Candidate", reason: "Good fit", synopsis: "Story", genres: ["Drama"],
  coverUrl: null, status: "FINISHED", chapters: 20, siteUrl: null,
  authors: ["Writer"], publishedFrom: "2018-11-12", publishedTo: "2019-03-04", volumes: 3, score: 8.3,
};

function saved(id: number, anilistId = id) {
  return {
    id, anilistId, publishedFrom: null, title: `Manga ${id}`, readingStatus: "planning", genres: "Drama",
    coverUrl: null, rating: null, categories: [], createdAt: "2020-01-01", updatedAt: "2020-01-01",
  };
}

let library: ReturnType<typeof saved>[];
let requests: Array<{ url: string; body: Record<string, unknown> }>;

beforeEach(() => {
  library = [];
  requests = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : {} });
    if (url === "/api/manga/list") return Response.json({ manga: library });
    if (url === "/api/categories") return Response.json({ categories: [] });
    if (url.startsWith("/api/manga/trending")) return Response.json({ results: [recommendation] });
    if (url === "/api/recommend") return Response.json({ recommendations: [recommendation] });
    if (url === "/api/manga/add") return Response.json({ manga: saved(1) });
    throw new Error(`Unexpected request: ${url}`);
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe("Search page", () => {
  it("renders an already-saved browse result as in the library", async () => {
    library = [saved(1, 42)];
    render(<SearchPage />);

    const inLibrary = await screen.findByRole("button", { name: "Candidate is in your library" });
    expect((inLibrary as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers starter categories when Search is the first page visited", async () => {
    let finishSeeding = () => {};
    const starterReady = new Promise<void>((resolve) => { finishSeeding = resolve; });
    let seeded = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/manga/list") {
        await starterReady;
        seeded = true;
        return Response.json({ manga: [] });
      }
      if (url === "/api/categories") {
        return Response.json({ categories: seeded ? [{ id: 1, name: "Favorites", color: "#60A5FA" }] : [] });
      }
      if (url.startsWith("/api/manga/trending")) return Response.json({ results: [recommendation] });
      throw new Error(`Unexpected request: ${url}`);
    }));

    render(<SearchPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Add Candidate to library" }));
    finishSeeding();

    const dialog = await screen.findByRole("dialog", { name: "Add to library" });
    expect(await within(dialog).findByRole("button", { name: /Favorites/ })).toBeTruthy();
  });

  it("keeps a saved title marked as added when only the category tag fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/manga/list") return Response.json({ manga: [] });
      if (url === "/api/categories") return Response.json({ categories: [{ id: 1, name: "Favorites", color: "#60A5FA" }] });
      if (url.startsWith("/api/manga/trending")) return Response.json({ results: [recommendation] });
      if (url === "/api/manga/add") return Response.json({ manga: saved(9, 42) });
      if (url === "/api/manga/9/categories") return Response.json({ error: "boom" }, { status: 500 });
      throw new Error(`Unexpected request: ${url}`);
    }));

    render(<SearchPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Add Candidate to library" }));
    const dialog = await screen.findByRole("dialog", { name: "Add to library" });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Favorites/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save to library" }));

    expect(await screen.findByRole("button", { name: "Candidate is in your library" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Added .*Candidate.*category/i);
  });
});

describe("Recommendations page", () => {
  async function quickRecommend() {
    render(<RecommendationsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Skip & recommend now/ }));
    await screen.findByRole("heading", { name: "Candidate" });
  }

  it.each(["save", "completed"])("keeps recommendation metadata in the %s flow", async (flow) => {
    await quickRecommend();

    if (flow === "completed") {
      fireEvent.click(screen.getByRole("button", { name: "Already read" }));
      const dialog = await screen.findByRole("dialog", { name: "Already read this one?" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Yes, add as completed" }));
    } else {
      fireEvent.click(screen.getByRole("button", { name: "Save Candidate to library" }));
    }

    await waitFor(() => expect(requests.some(({ url }) => url === "/api/manga/add")).toBe(true));
    const payload = requests.find(({ url }) => url === "/api/manga/add")?.body;
    expect(payload?.readingStatus).toBe(flow === "completed" ? "completed" : undefined);
    expect(payload).toMatchObject({
      anilistId: 42, authors: ["Writer"], publishedFrom: "2018-11-12",
      publishedTo: "2019-03-04", volumes: 3, score: 8.3,
    });
  });

  it("sends seen recommendation IDs instead of titles when asking for more", async () => {
    await quickRecommend();
    fireEvent.click(screen.getByRole("button", { name: /Suggest more/ }));

    await waitFor(() => expect(requests.filter(({ url }) => url === "/api/recommend")).toHaveLength(2));
    const request = requests.filter(({ url }) => url === "/api/recommend")[1];
    expect(request.body.excludeAnilistIds).toEqual([42]);
    expect(request.body).not.toHaveProperty("excludeTitles");
  });
});
