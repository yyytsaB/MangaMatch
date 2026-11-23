import { isValidElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LibraryPage from "@/app/library/page";
import RecommendationsPage from "@/app/recommendations/page";
import SearchPage from "@/app/search/page";

const hooks = vi.hoisted(() => ({ useState: vi.fn(), useEffect: vi.fn() }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), ...hooks }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

type Element = ReactElement<Record<string, unknown>>;

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children)];
}

function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement<{ children?: unknown }>(node)) return text(node.props.children);
  return typeof node === "string" ? node : "";
}

function mount(Page: () => ReactElement) {
  const state: unknown[] = [];
  const effects: Array<() => void> = [];
  let cursor = 0;
  let mounted = false;
  hooks.useState.mockImplementation((initial: unknown) => {
    const index = cursor++;
    if (!mounted) state[index] = typeof initial === "function" ? initial() : initial;
    return [state[index], (next: unknown) => {
      state[index] = typeof next === "function" ? next(state[index]) : next;
    }];
  });
  hooks.useEffect.mockImplementation((effect: () => void) => {
    if (!mounted) effects.push(effect);
  });

  function render() {
    cursor = 0;
    return elements(Page());
  }
  render();
  mounted = true;
  for (const effect of effects) effect();

  return {
    render,
    async click(label: string) {
      const button = render().find((node) => node.type === "button" && text(node.props.children).includes(label));
      expect(button, label).toBeDefined();
      await (button?.props.onClick as () => unknown)();
    },
  };
}

const recommendation = {
  anilistId: 42, title: "Candidate", reason: "Good fit", synopsis: "Story", genres: ["Drama"],
  coverUrl: null, status: "FINISHED", chapters: 20, siteUrl: null,
  authors: ["Writer"], publishedFrom: "2018-11-12", publishedTo: "2019-03-04", volumes: 3, score: 8.3,
};

function saved(id: number, publishedFrom: string | null, anilistId = id) {
  return {
    id, anilistId, publishedFrom, title: `Manga ${id}`, readingStatus: "planning", genres: "Drama",
    categories: [], createdAt: "2020-01-01", updatedAt: "2020-01-01",
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
    if (url === "/api/manga/add") return Response.json({ manga: saved(1, null) });
    throw new Error(`Unexpected request: ${url}`);
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe("library-facing pages", () => {
  it("renders an already-saved browse result as added when Search mounts", async () => {
    library = [saved(1, null, 42)];
    const page = mount(SearchPage);

    await vi.waitFor(() => {
      const card = page.render().find((node) => node.props.manga === recommendation ||
        (node.props.manga as { anilistId?: number } | undefined)?.anilistId === 42);
      expect(card?.props.isAdded).toBe(true);
    });
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
        return Response.json({ categories: seeded ? [{ id: 1, name: "Favorites" }] : [] });
      }
      if (url.startsWith("/api/manga/trending")) return Response.json({ results: [recommendation] });
      throw new Error(`Unexpected request: ${url}`);
    }));

    const page = mount(SearchPage);
    const card = await vi.waitFor(() => {
      const result = page.render().find((node) => node.props.onAdd && node.props.manga);
      expect(result).toBeDefined();
      return result;
    });
    (card?.props.onAdd as (manga: typeof recommendation) => void)(recommendation);
    finishSeeding();

    await vi.waitFor(() => expect(page.render().some((node) =>
      typeof node.props.onClick === "function" && text(node.props.children).includes("Favorites")
    )).toBe(true));
  });

  it.each([["year-newest", ["2", "1", "3"]], ["year-oldest", ["1", "2", "3"]]])(
    "sorts mixed-format dates for %s and puts unknown dates last", async (sort, expected) => {
      library = [saved(1, "December 31, 1999"), saved(2, "2000-01-01"), saved(3, "Unknown")];
      const page = mount(LibraryPage);
      const cards = () => page.render().filter((node) => node.type === "div" && ["1", "2", "3"].includes(String(node.key)));
      await vi.waitFor(() => expect(cards()).toHaveLength(3));

      const select = page.render().find((node) => node.type === "select" && node.props.value === "recently-added");
      (select?.props.onChange as (event: unknown) => void)({ target: { value: sort } });
      expect(cards().map((node) => node.key)).toEqual(expected);
    }
  );

  it.each(["save", "completed"])("keeps recommendation metadata in the %s flow", async (flow) => {
    const page = mount(RecommendationsPage);
    await page.click("Quick Recommend");

    if (flow === "completed") {
      await page.click("Read");
      await page.click("Yes, Add as Completed");
    } else {
      await page.click("+ Save");
    }

    const payload = requests.find(({ url }) => url === "/api/manga/add")?.body;
    expect(payload?.readingStatus).toBe(flow === "completed" ? "completed" : undefined);
    expect(payload).toMatchObject({
      anilistId: 42, authors: ["Writer"], publishedFrom: "2018-11-12",
      publishedTo: "2019-03-04", volumes: 3, score: 8.3,
    });
  });

  it("sends seen recommendation IDs instead of titles when asking for more", async () => {
    const page = mount(RecommendationsPage);
    await page.click("Quick Recommend");
    await page.click("Suggest More");

    const request = requests.filter(({ url }) => url === "/api/recommend")[1];
    expect(request.body.excludeAnilistIds).toEqual([42]);
    expect(request.body).not.toHaveProperty("excludeTitles");
  });
});
