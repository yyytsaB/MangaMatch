import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();
vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));

import { getSessionId } from "@/lib/session";

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
