import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

// Lean smoke coverage of the four core flows against a real server and a
// throwaway SQLite database. External catalogue/ranking calls are stubbed at
// the browser→API boundary so runs are deterministic and need no API keys.
// Every test gets a fresh browser context, i.e. a brand-new session whose
// starter shelf is seeded on first visit.

function catalogueEntry(anilistId: number, title: string) {
  return {
    anilistId,
    title,
    genres: ["Drama", "Mystery"],
    coverUrl: null,
    synopsis: "A smoke-test synopsis.",
    status: "FINISHED",
    authors: ["Test Author"],
    publishedFrom: "2001-02-03",
    publishedTo: "2004-05-06",
    chapters: 48,
    volumes: 6,
    score: 8.1,
    siteUrl: null,
  };
}

async function stubCatalogue(page: Page) {
  await page.route("**/api/manga/trending**", (route) =>
    route.fulfill({ json: { results: [catalogueEntry(990001, "Smoke Test Browse")] } })
  );
  await page.route("**/api/manga/search**", (route) =>
    route.fulfill({ json: { results: [catalogueEntry(990002, "Smoke Test Search")] } })
  );
  await page.route("**/api/recommend", (route) =>
    route.fulfill({
      json: {
        recommendations: [{ ...catalogueEntry(990003, "Smoke Test Pick"), reason: "Matches your love of quiet mysteries." }],
      },
    })
  );
}

const filters = (page: Page) => page.getByRole("complementary", { name: "Library filters" });

test("library: filter by status, open a title, and come back to the same shelf", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("link", { name: /Omniscient Reader/ })).toBeVisible();

  await filters(page).getByRole("button", { name: /^Reading/ }).click();
  await expect(page).toHaveURL(/\/library\?status=reading$/);
  await expect(page.getByRole("link", { name: /Omniscient Reader/ })).toBeVisible();

  await page.getByRole("link", { name: /Omniscient Reader/ }).click();
  await expect(page).toHaveURL(/\/library\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Omniscient Reader" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/library\?status=reading$/);
  await expect(filters(page).getByRole("button", { name: /^Reading/ })).toHaveAttribute("aria-pressed", "true");

  // The in-page Back link restores the same shelf too.
  await page.getByRole("link", { name: /Omniscient Reader/ }).click();
  await page.getByRole("link", { name: "Back to library" }).click();
  await expect(page).toHaveURL(/\/library\?status=reading$/);

  // Following the Library nav link from a filtered shelf resets the view to match the URL.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Library" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(filters(page).getByRole("button", { name: /^All manga/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /Blue Lock/ })).toBeVisible();

  // Fast typing is never rolled back by a lagging URL update.
  const search = filters(page).getByRole("searchbox", { name: "Search your library" });
  await search.pressSequentially("omniscient", { delay: 0 });
  await expect(search).toHaveValue("omniscient");
  await expect(page).toHaveURL(/\/library\?q=omniscient$/);
  await expect(page.getByRole("link", { name: /Omniscient Reader/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Blue Lock/ })).toHaveCount(0);
});

test("search: add a browse result and find it in the library", async ({ page }) => {
  await stubCatalogue(page);
  await page.goto("/search");

  await page.getByRole("button", { name: "Add Smoke Test Browse to library" }).click();
  const dialog = page.getByRole("dialog", { name: "Add to library" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Save to library" }).click();

  await expect(page.getByRole("button", { name: "Smoke Test Browse is in your library" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Added");

  await page.goto("/library");
  await expect(page.getByRole("link", { name: /Smoke Test Browse/ })).toBeVisible();
});

test("recommend: get picks and save one to the library", async ({ page }) => {
  await stubCatalogue(page);
  await page.goto("/recommendations");

  await page.getByRole("button", { name: "Skip & recommend now" }).click();
  await expect(page.getByRole("heading", { name: "Smoke Test Pick" })).toBeVisible();
  await expect(page.getByText("Why this matches you")).toBeVisible();

  await page.getByRole("button", { name: "Save Smoke Test Pick to library" }).click();
  await expect(page.getByRole("button", { name: "Smoke Test Pick is in your library" })).toBeVisible();

  await page.goto("/library");
  const card = page.getByRole("link", { name: /Smoke Test Pick/ });
  await expect(card).toBeVisible();
  await card.click();
  // Full metadata survived the save.
  await expect(page.getByText("Test Author")).toBeVisible();
  await expect(page.getByText("48", { exact: true })).toBeVisible();
});

test("find similar: one click from a title, then hide a pick for good", async ({ page }) => {
  await stubCatalogue(page);
  await page.goto("/library");
  await page.getByRole("link", { name: /Omniscient Reader/ }).click();
  await expect(page).toHaveURL(/\/library\/\d+$/);
  const mangaId = Number(page.url().split("/").pop());

  const recommendRequest = page.waitForRequest("**/api/recommend");
  await page.getByRole("link", { name: "Find similar" }).click();
  expect((await recommendRequest).postDataJSON()).toMatchObject({ baseMangaIds: [mangaId], diverge: false });
  await expect(page.getByRole("heading", { name: "Smoke Test Pick" })).toBeVisible();
  await expect(page.getByText(/Anchored on Omniscient Reader/)).toBeVisible();
  await expect(page).toHaveURL(/\/recommendations$/);

  await page.getByRole("button", { name: "Not interested in Smoke Test Pick" }).click();
  await expect(page.getByRole("heading", { name: "Smoke Test Pick" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("won’t suggest");

  // Persisted for this session on the server, so it's excluded from future pools.
  const dismissed = await (await page.request.get("/api/dismissed")).json();
  expect(dismissed.dismissed.map((d: { anilistId: number }) => d.anilistId)).toContain(990003);

  // And it can be restored later from Hidden picks.
  await page.getByRole("button", { name: "Hidden picks" }).click();
  const hidden = page.getByRole("dialog", { name: "Hidden picks" });
  await hidden.getByRole("button", { name: "Restore Smoke Test Pick" }).click();
  await expect(hidden.getByText("Nothing hidden yet.")).toBeVisible();
  const after = await (await page.request.get("/api/dismissed")).json();
  expect(after.dismissed).toEqual([]);
});

test("backup: export, remove a title, then import it back", async ({ page }, testInfo) => {
  await page.goto("/library");
  await expect(page.getByRole("link", { name: /Omniscient Reader/ })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await filters(page).getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath("backup.json");
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  expect(backup.library.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Remove Omniscient Reader from library" }).click();
  await page.getByRole("dialog", { name: "Remove from library?" }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("link", { name: /Omniscient Reader/ })).toHaveCount(0);

  await filters(page).getByRole("button", { name: "Import" }).click();
  const dialog = page.getByRole("dialog", { name: "Import a backup" });
  await dialog.getByLabel("Choose backup file").setInputFiles(backupPath);
  await expect(dialog.getByText(/titles ·/)).toBeVisible();
  await dialog.getByRole("button", { name: "Restore library" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: /Omniscient Reader/ })).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("library filters open in a drawer and update the URL", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("link", { name: /Omniscient Reader/ })).toBeVisible();
    await expect(filters(page)).toBeHidden();

    await page.getByRole("button", { name: "Filters" }).click();
    const drawer = page.getByRole("dialog", { name: "Filters" });
    await drawer.getByRole("button", { name: /^Completed/ }).click();
    await expect(page).toHaveURL(/status=completed/);

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("button", { name: "Filters" })).toBeFocused();
  });
});
