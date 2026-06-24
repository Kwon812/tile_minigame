import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/admin/game/create
//
// Game rooms live in the standalone socket server's memory (Render), not here.
// This route just proxies the request to that server so the admin UI can stay
// same-origin. The socket server loads the quizzes and creates the room.
export async function POST(request: NextRequest) {
  const target =
    process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_URL;

  if (!target) {
    return NextResponse.json(
      { error: "SOCKET_SERVER_URL is not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Shared secret so the socket server only accepts game creation from this app
  // (this route is itself already behind admin Basic Auth via proxy.ts).
  if (process.env.SOCKET_ADMIN_SECRET) {
    headers["x-admin-secret"] = process.env.SOCKET_ADMIN_SECRET;
  }

  try {
    const res = await fetch(`${target.replace(/\/$/, "")}/game/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        error: `소켓 서버에 연결할 수 없습니다: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      },
      { status: 502 }
    );
  }
}
