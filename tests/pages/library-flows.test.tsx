// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecommendationsPage from "@/app/recommendations/page";
import SearchPage from "@/app/search/page";

const nav = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/recommendations",
  useSearchParams: () => new URLSearchParams(nav.search),
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
  nav.search = "";
  library = [];
  requests = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : {} });
    if (url === "/api/manga/list") return Response.json({ manga: library });
    if (url === "/api/categories") return Response.json({ categories: [] });
    if (url.startsWith("/api/manga/trending")) return Response.json({ results: [recommendation] });
    if (url === "/api/recommend") return Response.json({ recommendations: [recommendation] });
    if (url === "/api/manga/add") return Response.json({ manga: saved(1) });
    if (url === "/api/dismissed" && !init?.method) {
      return Response.json({ dismissed: [{ anilistId: 77, title: "Hidden Pick", createdAt: "2026-01-01T00:00:00.000Z" }] });
    }
    if (url === "/api/dismissed") return Response.json({ success: true });
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
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Added .*Candidate.*category/i));
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

  it("hides a pick for good with Not interested, and can undo it", async () => {
    await quickRecommend();

    fireEvent.click(screen.getByRole("button", { name: "Not interested in Candidate" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Candidate" })).toBeNull());
    const dismissal = requests.find(({ url, body }) => url === "/api/dismissed" && body.anilistId === 42);
    expect(dismissal?.body).toEqual({ anilistId: 42, title: "Candidate" });

    fireEvent.click(await within(screen.getByRole("status")).findByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("heading", { name: "Candidate" })).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls.some(([url, init]) =>
      url === "/api/dismissed" && init?.method === "DELETE" && JSON.parse(String(init.body)).anilistId === 42
    )).toBe(true);
  });

  it("remembers a pick dismissed from the already-read dialog", async () => {
    await quickRecommend();
    fireEvent.click(screen.getByRole("button", { name: "Already read" }));
    const dialog = await screen.findByRole("dialog", { name: "Already read this one?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Just dismiss" }));

    await waitFor(() => expect(requests.some(({ url }) => url === "/api/dismissed")).toBe(true));
    expect(screen.queryByRole("heading", { name: "Candidate" })).toBeNull();
  });

  it("finds similar manga in one click when opened with ?similarTo", async () => {
    nav.search = "similarTo=5";
    library = [saved(5, 77)];
    render(<RecommendationsPage />);

    expect(await screen.findByRole("heading", { name: "Candidate" })).toBeTruthy();
    const request = requests.find(({ url }) => url === "/api/recommend");
    expect(request?.body).toMatchObject({ baseMangaIds: [5], diverge: false, excludeAnilistIds: [] });
    expect(screen.getByText(/Anchored on Manga 5/)).toBeTruthy();
  });

  it("ignores an invalid ?similarTo instead of auto-running", async () => {
    nav.search = "similarTo=abc";
    render(<RecommendationsPage />);

    expect(await screen.findByRole("button", { name: /Skip & recommend now/ })).toBeTruthy();
    expect(requests.some(({ url }) => url === "/api/recommend")).toBe(false);
  });

  it("starts hidden gems at their own first page, separately from Suggest more", async () => {
    await quickRecommend();
    const pages = () => requests.filter(({ url }) => url === "/api/recommend")
      .map(({ body }) => `${body.diverge ? "gems" : "popular"}:${body.page}`);

    fireEvent.click(screen.getByRole("button", { name: /Something different/ }));
    await waitFor(() => expect(pages()).toHaveLength(2));
    fireEvent.click(await screen.findByRole("button", { name: /Something different/ }));
    await waitFor(() => expect(pages()).toHaveLength(3));
    fireEvent.click(await screen.findByRole("button", { name: /Suggest more/ }));
    await waitFor(() => expect(pages()).toHaveLength(4));

    expect(pages()).toEqual(["popular:1", "gems:1", "gems:2", "popular:2"]);
  });

  it("drops the Undo offer once a new batch replaces the dismissed one", async () => {
    await quickRecommend();
    fireEvent.click(screen.getByRole("button", { name: "Not interested in Candidate" }));
    await within(screen.getByRole("status")).findByRole("button", { name: "Undo" });

    fireEvent.click(screen.getByRole("button", { name: /Suggest more/ }));
    await waitFor(() => expect(within(screen.getByRole("status")).queryByRole("button", { name: "Undo" })).toBeNull());
  });

  it("says that dismissing an already-read pick is permanent", async () => {
    await quickRecommend();
    fireEvent.click(screen.getByRole("button", { name: "Already read" }));
    const dialog = await screen.findByRole("dialog", { name: "Already read this one?" });
    expect(dialog.textContent).toMatch(/won.t be suggested again/i);
  });

  it("lists hidden picks and restores one", async () => {
    render(<RecommendationsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Hidden picks/ }));
    const dialog = await screen.findByRole("dialog", { name: "Hidden picks" });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Restore Hidden Pick" }));

    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url, init]) =>
      url === "/api/dismissed" && init?.method === "DELETE" && JSON.parse(String(init.body)).anilistId === 77
    )).toBe(true));
    await waitFor(() => expect(within(dialog).queryByText("Hidden Pick")).toBeNull());
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
