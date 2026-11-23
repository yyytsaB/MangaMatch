// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CoverImage from "@/components/CoverImage";

describe("CoverImage", () => {
  it("lazy-loads cover art", () => {
    render(<CoverImage src="https://img.example/cover.jpg" alt="Monster" />);
    const img = screen.getByRole("img", { name: "Monster" });
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
  });

  it("falls back to title typography when the image fails to load", () => {
    render(<CoverImage src="https://img.example/broken.jpg" alt="Monster" />);
    fireEvent.error(screen.getByRole("img", { name: "Monster" }));
    expect(screen.queryByRole("img", { name: "Monster" })).toBeNull();
    expect(screen.getByText("Monster")).toBeTruthy();
  });

  it("falls back when the image already failed before hydration attached onError", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
    try {
      render(<CoverImage src="https://img.example/404.jpg" alt="Monster" priority />);
      expect(screen.queryByRole("img", { name: "Monster" })).toBeNull();
      expect(screen.getByText("Monster")).toBeTruthy();
    } finally {
      complete.mockRestore();
      width.mockRestore();
    }
  });

  it("keeps an image that already loaded successfully", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(460);
    try {
      render(<CoverImage src="https://img.example/ok.jpg" alt="Monster" priority />);
      expect(screen.getByRole("img", { name: "Monster" })).toBeTruthy();
    } finally {
      complete.mockRestore();
      width.mockRestore();
    }
  });

  it("shows the title fallback when there is no cover at all", () => {
    render(<CoverImage src={null} alt="Pluto" />);
    expect(screen.getByText("Pluto")).toBeTruthy();
  });
});
