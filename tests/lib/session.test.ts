/// <reference types="vite/client" />
import { NextRequest, type NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));

import { fetchJson } from "@/lib/http";
import { getSessionId, SESSION_COOKIE } from "@/lib/session";

describe("getSessionId", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
  });

  it("reads the session cookie from the server request context", async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: " abc-123 " }) });
    await expect(getSessionId()).resolves.toBe("abc-123");
  });

  it("falls back to the default session outside a Next.js request", async () => {
    cookiesMock.mockImplementation(async () => {
      throw new Error("cookies was called outside a request scope");
    });
    await expect(getSessionId()).resolves.toBe("default");
  });

  it("rethrows Next.js dynamic-usage errors so session pages are never statically prerendered", async () => {
    const dynamicUsage = Object.assign(new Error("Dynamic server usage: cookies"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    cookiesMock.mockImplementation(async () => {
      throw dynamicUsage;
    });
    await expect(getSessionId()).rejects.toBe(dynamicUsage);
  });
});

describe("session bootstrap", () => {
  it("forwards the first visit's cookie to SSR and keeps the same session for client API requests", async () => {
    const loaders = import.meta.glob<{ proxy: (req: NextRequest) => NextResponse }>("../../proxy.ts");
    expect(loaders["../../proxy.ts"], "first requests need a session bootstrap").toBeTypeOf("function");
    const { proxy } = await loaders["../../proxy.ts"]();
    const response = proxy(new NextRequest("https://example.test/"));
    const cookie = response.cookies.get(SESSION_COOKIE);

    expect(cookie?.value).toMatch(/^[a-f\d-]{36}$/);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    const forwarded = new NextRequest("https://example.test/", {
      headers: { cookie: response.headers.get("x-middleware-request-cookie") ?? "" },
    });
    cookiesMock.mockResolvedValue(forwarded.cookies);
    await expect(getSessionId()).resolves.toBe(cookie?.value);

    const apiRequest = new NextRequest("https://example.test/api/manga/list", {
      headers: { cookie: `${SESSION_COOKIE}=${cookie?.value}` },
    });
    expect(proxy(apiRequest).cookies.get(SESSION_COOKIE)).toBeUndefined();
    await expect(getSessionId(apiRequest)).resolves.toBe(cookie?.value);
  });

  it("does not send a competing local-storage identity from the browser", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => "old-browser-id" });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await fetchJson("/api/manga/list");
      expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has("x-session-id")).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
