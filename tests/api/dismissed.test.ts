import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findMany = vi.fn();
const upsert = vi.fn();
const deleteMany = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    dismissedManga: {
      findMany: (a: unknown) => findMany(a),
      upsert: (a: unknown) => upsert(a),
      deleteMany: (a: unknown) => deleteMany(a),
    },
  },
}));

const { GET, POST, DELETE } = await import("@/app/api/dismissed/route");

function request(method: string, body?: unknown, session = "reader-a") {
  return new NextRequest("http://localhost/api/dismissed", {
    method,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", cookie: `mangamatch_session=${session}` },
  });
}

beforeEach(() => {
  findMany.mockResolvedValue([{ anilistId: 42, title: "Candidate", createdAt: new Date("2026-01-01") }]);
  upsert.mockResolvedValue({ anilistId: 42 });
  deleteMany.mockResolvedValue({ count: 1 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const m of [findMany, upsert, deleteMany]) m.mockReset();
});

describe("GET /api/dismissed", () => {
  it("lists only the caller's dismissed titles, newest first", async () => {
    const res = await GET(request("GET"));

    expect(res.status).toBe(200);
    expect((await res.json()).dismissed).toEqual([
      { anilistId: 42, title: "Candidate", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { sessionId: "reader-a" },
      orderBy: { createdAt: "desc" },
      select: { anilistId: true, title: true, createdAt: true },
    });
  });
});

describe("POST /api/dismissed", () => {
  it("records a dismissal idempotently, scoped to the session", async () => {
    const res = await POST(request("POST", { anilistId: 42, title: "  Candidate  " }));

    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith({
      where: { sessionId_anilistId: { sessionId: "reader-a", anilistId: 42 } },
      update: {},
      create: { sessionId: "reader-a", anilistId: 42, title: "Candidate" },
    });
  });

  it("accepts a dismissal without a title", async () => {
    await POST(request("POST", { anilistId: 7 }));
    expect(upsert.mock.calls[0][0].create).toEqual({ sessionId: "reader-a", anilistId: 7, title: null });
  });

  it.each([
    ["malformed JSON", "{"],
    ["a missing id", {}],
    ["a non-numeric id", { anilistId: "42" }],
    ["a non-positive id", { anilistId: 0 }],
    ["an oversized title", { anilistId: 42, title: "x".repeat(501) }],
    ["a non-string title", { anilistId: 42, title: 5 }],
  ])("rejects %s", async (_label, body) => {
    const res = await POST(request("POST", body));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/dismissed", () => {
  it("undoes a dismissal only within the caller's session", async () => {
    const res = await DELETE(request("DELETE", { anilistId: 42 }));

    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalledWith({ where: { sessionId: "reader-a", anilistId: 42 } });
  });

  it("rejects an invalid id", async () => {
    const res = await DELETE(request("DELETE", { anilistId: -1 }));
    expect(res.status).toBe(400);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
