// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CategoryManager from "@/components/CategoryManager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => vi.unstubAllGlobals());

describe("CategoryManager", () => {
  it("tells the reader when toggling a category fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/categories") return Response.json({ categories: [{ id: 3, name: "Favorites", color: "#60A5FA" }] });
      if (url === "/api/manga/7/categories") return Response.json({ error: "Category not found" }, { status: 404 });
      throw new Error(`Unexpected request: ${url}`);
    }));

    render(<CategoryManager mangaId={7} assigned={[]} />);
    fireEvent.click(await screen.findByRole("button", { name: /Favorites/ }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/Category not found/);
  });
});
