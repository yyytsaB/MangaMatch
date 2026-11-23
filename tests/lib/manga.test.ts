import { describe, expect, it } from "vitest";
import { franchiseKey } from "@/lib/manga";

describe("franchiseKey", () => {
  it.each([
    ["Umineko When They Cry Episode 8: Twilight of the Golden Witch", "Umineko When They Cry Episode 5: End of the Golden Witch"],
    ["Higurashi WHEN THEY CRY: Massacre Arc", "Higurashi WHEN THEY CRY: Eye Opening Arc"],
    ["Ace of the Diamond Act II", "Ace of the Diamond"],
    ["Vagabond: Saigo no Manga-ten", "Vagabond"],
    ["Bungo Stray Dogs Beast", "Bungo Stray Dogs"],
    ["One-Punch Man", "One Punch Man"],
    ["Jujutsu Kaisen 0", "Jujutsu Kaisen"],
    ["The Apothecary Diaries", "Apothecary Diaries"],
  ])("groups %s with %s", (a, b) => {
    expect(franchiseKey(a)).toBe(franchiseKey(b));
  });

  it.each([
    ["Space Brothers", "Blue Giant"],
    ["Ping Pong", "Ping"],
    ["Monster", "This Monster Wants to Eat Me"],
    ["Re:Zero - Starting Life in Another World", "Re:Monster"],
    ["The Act of Killing", "The Act of Love"],
  ])("keeps %s and %s apart", (a, b) => {
    expect(franchiseKey(a)).not.toBe(franchiseKey(b));
  });

  it("still groups entries of a short-prefix franchise", () => {
    expect(franchiseKey("Re:Zero Chapter 3: Truth of Zero")).toBe(franchiseKey("Re:Zero - Starting Life in Another World"));
  });

  it("never returns an empty key for a non-empty title", () => {
    expect(franchiseKey("Act")).not.toBe("");
    expect(franchiseKey("!!!")).toBe("!!!");
  });
});
