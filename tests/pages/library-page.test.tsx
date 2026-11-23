// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LibraryView from "@/components/library/LibraryView";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const shelf = [
  {
    id: 1, anilistId: 101, title: "Vinland Saga", genres: "Action,Drama", coverUrl: null, synopsis: null,
    publicationStatus: "FINISHED", readingStatus: "reading", rating: 9, publishedFrom: "2005-04-13",
    createdAt: "2024-01-03T00:00:00.000Z", updatedAt: "2024-01-03T00:00:00.000Z", siteUrl: null,
    categories: [{ id: 7, name: "Masterpiece", color: "#F472B6" }],
  },
  {
    id: 2, anilistId: 102, title: "Blue Period", genres: "Drama", coverUrl: null, synopsis: null,
    publicationStatus: "RELEASING", readingStatus: "completed", rating: null, publishedFrom: "2017-06-24",
    createdAt: "2024-01-02T00:00:00.000Z", updatedAt: "2024-01-02T00:00:00.000Z", siteUrl: null,
    categories: [],
  },
];

let replaceState: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/manga/list") return Response.json({ manga: shelf });
    if (url === "/api/categories") return Response.json({ categories: [{ id: 7, name: "Masterpiece", color: "#F472B6" }] });
    throw new Error(`Unexpected request: ${url}`);
  }));
  replaceState = vi.spyOn(window.history, "replaceState");
});

afterEach(() => {
  vi.unstubAllGlobals();
  replaceState.mockRestore();
  window.history.pushState(null, "", "/library");
});

function lastUrl() {
  const call = replaceState.mock.calls.at(-1);
  return new URL(String(call?.[2]), "http://localhost");
}

describe("Library page", () => {
  it("restores filters from the URL and renders each card as a link to its detail page", async () => {
    window.history.pushState(null, "", "/library?status=reading");
    render(<LibraryView />);

    const link = await screen.findByRole("link", { name: /Vinland Saga/ });
    expect(link.getAttribute("href")).toBe("/library/1");
    expect(screen.queryByRole("link", { name: /Blue Period/ })).toBeNull();
  });

  it("writes filter, search, sort, and view changes back to the URL", async () => {
    window.history.pushState(null, "", "/library");
    render(<LibraryView />);
    await screen.findByRole("link", { name: /Vinland Saga/ });

    const filters = screen.getByRole("complementary", { name: "Library filters" });
    fireEvent.click(within(filters).getByRole("button", { name: /Completed/ }));
    expect(lastUrl().searchParams.get("status")).toBe("completed");
    expect(screen.queryByRole("link", { name: /Vinland Saga/ })).toBeNull();

    fireEvent.change(within(filters).getByRole("searchbox", { name: "Search your library" }), { target: { value: "blue" } });
    expect(lastUrl().searchParams.get("q")).toBe("blue");

    fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), { target: { value: "title-az" } });
    expect(lastUrl().searchParams.get("sort")).toBe("title-az");

    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(lastUrl().searchParams.get("view")).toBe("list");
    expect(lastUrl().pathname).toBe("/library");
  });

  it("follows the URL when it changes from outside, e.g. the Library nav link", async () => {
    window.history.pushState(null, "", "/library");
    const { rerender } = render(<LibraryView />);
    await screen.findByRole("link", { name: /Vinland Saga/ });

    const filters = screen.getByRole("complementary", { name: "Library filters" });
    fireEvent.click(within(filters).getByRole("button", { name: /Completed/ }));
    expect(screen.queryByRole("link", { name: /Vinland Saga/ })).toBeNull();

    act(() => window.history.pushState(null, "", "/library"));
    rerender(<LibraryView />);

    expect(await screen.findByRole("link", { name: /Vinland Saga/ })).toBeTruthy();
    expect(within(filters).getByRole("button", { name: /All manga/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("filters by category and shows the stored category colour", async () => {
    window.history.pushState(null, "", "/library");
    render(<LibraryView />);
    await screen.findByRole("link", { name: /Vinland Saga/ });

    const filters = screen.getByRole("complementary", { name: "Library filters" });
    const tag = within(filters).getByRole("button", { name: /Masterpiece/ });
    const dot = tag.querySelector("[aria-hidden='true'][style]") as HTMLElement | null;
    expect(dot?.style.backgroundColor).toBe("rgb(244, 114, 182)");

    fireEvent.click(tag);
    expect(lastUrl().searchParams.get("category")).toBe("Masterpiece");
    expect(screen.queryByRole("link", { name: /Blue Period/ })).toBeNull();
  });

  it("keeps remove actions as separate, named buttons outside the card link", async () => {
    window.history.pushState(null, "", "/library");
    render(<LibraryView />);
    const link = await screen.findByRole("link", { name: /Vinland Saga/ });

    const remove = screen.getByRole("button", { name: "Remove Vinland Saga from library" });
    expect(link.contains(remove)).toBe(false);

    fireEvent.click(remove);
    expect(await screen.findByRole("dialog", { name: "Remove from library?" })).toBeTruthy();
  });

  it("treats a finished import as a success even if the follow-up refresh fails", async () => {
    let imported = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/manga/import") {
        imported = true;
        return Response.json({ success: true, mode: "merge", importedCount: 2, updatedCount: 0, totalProcessed: 2, createdCategoriesCount: 0 });
      }
      if (url === "/api/manga/list") return Response.json({ manga: shelf });
      if (url === "/api/categories") {
        return imported ? Response.json({ error: "flaky" }, { status: 500 }) : Response.json({ categories: [] });
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
    window.history.pushState(null, "", "/library");
    render(<LibraryView />);
    await screen.findByRole("link", { name: /Vinland Saga/ });

    fireEvent.click(within(screen.getByRole("complementary", { name: "Library filters" })).getByRole("button", { name: "Import" }));
    const dialog = await screen.findByRole("dialog", { name: "Import a backup" });
    const backup = new File([JSON.stringify({ library: [{}, {}], categories: [] })], "backup.json", { type: "application/json" });
    fireEvent.change(within(dialog).getByLabelText("Choose backup file"), { target: { files: [backup] } });
    const restore = within(dialog).getByRole("button", { name: "Restore library" }) as HTMLButtonElement;
    await waitFor(() => expect(restore.disabled).toBe(false));
    fireEvent.click(restore);

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Import a backup" })).toBeNull());
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Restored/));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("clears every filter from the empty-result state", async () => {
    window.history.pushState(null, "", "/library?q=zzz&genre=Drama");
    render(<LibraryView />);

    fireEvent.click(await screen.findByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(screen.getByRole("link", { name: /Blue Period/ })).toBeTruthy());
    expect(lastUrl().search).toBe("");
  });
});
