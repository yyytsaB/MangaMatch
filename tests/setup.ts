import { afterEach } from "vitest";

// jsdom lacks Blob#text(), which every browser MangaMatch targets supports.
if (typeof Blob !== "undefined" && typeof Blob.prototype.text !== "function" && typeof FileReader !== "undefined") {
  Blob.prototype.text = function text(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

// DOM suites opt in per file with `// @vitest-environment jsdom`; unmount
// whatever they rendered so tests never leak portals or listeners.
afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
