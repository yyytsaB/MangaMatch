import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "mangamatch_session";

/**
 * Extracts the sessionId from a cookie or a header-only API request.
 * Falls back to "default" if running outside a request context.
 */
export async function getSessionId(req?: Request | NextRequest): Promise<string> {
  if (req) {
    if ("cookies" in req && typeof req.cookies?.get === "function") {
      const cookieVal = req.cookies.get(SESSION_COOKIE)?.value;
      if (cookieVal && cookieVal.trim()) {
        return cookieVal.trim();
      }
    }

    const rawCookie = req.headers.get("cookie");
    if (rawCookie) {
      const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim();
      }
    }

    const headerSession = req.headers.get("x-session-id")?.trim();
    if (headerSession) return headerSession;
  }

  try {
    const cookieStore = await cookies();
    const serverCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (serverCookie && serverCookie.trim()) {
      return serverCookie.trim();
    }
  } catch (err) {
    // Prerender bailouts must reach Next.js, or session pages get cached statically.
    unstable_rethrow(err);
    // Outside a Next.js request (e.g. tests), fall back to the default session.
  }

  return "default";
}
