import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/me — only reachable when the Basic Auth gate (proxy.ts) passes
// (or is disabled in dev). The game page calls this to tell if the current
// browser is a logged-in admin; the browser auto-sends cached credentials.
export async function GET() {
  // If the gate is disabled (no password configured) there is no real admin —
  // treat everyone as a normal player so games stay playable.
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ admin: false });
  }
  return NextResponse.json({ admin: true });
}
