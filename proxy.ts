import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value.trim() ||
      (request.nextUrl.pathname.startsWith("/api/") && request.headers.get("x-session-id")?.trim())) {
    return NextResponse.next();
  }

  const sessionId = randomUUID();
  request.cookies.set(SESSION_COOKIE, sessionId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ["/", "/library/:path*", "/search", "/recommendations", "/api/:path*"],
};
