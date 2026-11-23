import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
const findFirst = vi.fn();
const findCategory = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    manga: {
      findFirst: (a: unknown) => findFirst(a),
      update: (a: unknown) => update(a),
    },
    category: { findUnique: (a: unknown) => findCategory(a) },
  },
}));

const { POST, DELETE } = await import(
  "@/app/api/manga/[id]/categories/route"
);

function request(method: string, body: unknown) {
  return new Request("http://localhost/api/manga/7/categories", {
    method,
    headers: { "Content-Type": "application/json", "x-session-id": "reader-a" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "7" }) };

beforeEach(() => {
  findFirst.mockResolvedValue({ id: 7, title: "Berserk" });
  findCategory.mockResolvedValue({ id: 3 });
  update.mockResolvedValue({ id: 7, categories: [{ id: 3 }] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  findFirst.mockReset();
  findCategory.mockReset();
  update.mockReset();
});

it.each([{ method: "POST", handler: POST }, { method: "DELETE", handler: DELETE }])(
  "$method returns not found for a category outside the current library",
  async ({ method, handler }) => {
    findCategory.mockImplementation(async ({ where }) =>
      where.sessionId === "reader-a" ? null : { id: 3 }
    );
    const res = await handler(request(method, { categoryId: 3 }), params);
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  }
);

describe("POST /api/manga/[id]/categories", () => {
  it("connects the category, coercing string ids to numbers", async () => {
    const res = await POST(request("POST", { categoryId: "3" }), params);

    expect(update).toHaveBeenCalledWith({
      where: { id: 7, sessionId: "reader-a" },
      data: { categories: { connect: { id: 3, sessionId: "reader-a" } } },
      include: { categories: { where: { sessionId: "reader-a" } } },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      manga: { id: 7, categories: [{ id: 3 }] },
    });
  });

  it("500s when the connect fails", async () => {
    update.mockRejectedValue(new Error("nope"));

    const res = await POST(request("POST", { categoryId: 3 }), params);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to add category" });
  });
});

describe("DELETE /api/manga/[id]/categories", () => {
  it("disconnects the category", async () => {
    const res = await DELETE(request("DELETE", { categoryId: 3 }), params);

    expect(update).toHaveBeenCalledWith({
      where: { id: 7, sessionId: "reader-a" },
      data: { categories: { disconnect: { id: 3, sessionId: "reader-a" } } },
      include: { categories: { where: { sessionId: "reader-a" } } },
    });
    expect(res.status).toBe(200);
  });

  it("500s when the disconnect fails", async () => {
    update.mockRejectedValue(new Error("nope"));

    const res = await DELETE(request("DELETE", { categoryId: 3 }), params);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to remove category" });
  });
});
