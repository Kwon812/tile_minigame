import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/rooms — public: the home page lists joinable rooms for players.
// Proxies to the socket server's live room list.
export async function GET() {
  const target =
    process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_URL;

  if (!target) {
    return NextResponse.json(
      { error: "SOCKET_SERVER_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${target.replace(/\/$/, "")}/rooms`, {
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
