import type { NextRequest } from "next/server";

// HTTP Basic Auth gate for the admin surface (the /admin page and the
// /api/admin/* routes). Lightweight protection without a full login system.
//
// Configure credentials via env:
//   ADMIN_USER      (default: "admin")
//   ADMIN_PASSWORD  (required to enable the gate)
// If ADMIN_PASSWORD is not set, the gate is disabled (handy for local dev).
//
// Note: the public /api/rooms route is intentionally NOT matched so players can
// still list joinable rooms on the home page.

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  // Gate disabled when no password configured.
  if (!expectedPassword) return;

  const expectedUser = process.env.ADMIN_USER || "admin";

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return unauthorized();

  let user = "";
  let pass = "";
  try {
    const decoded = atob(header.slice(6)); // "user:pass"
    const idx = decoded.indexOf(":");
    user = decoded.slice(0, idx);
    pass = decoded.slice(idx + 1);
  } catch {
    return unauthorized();
  }

  if (user !== expectedUser || pass !== expectedPassword) {
    return unauthorized();
  }
  // Authenticated — continue to the route.
}
