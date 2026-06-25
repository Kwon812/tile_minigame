// Standalone Socket.IO game server — deployed on Render.
//
// This process owns ALL real-time game state (rooms, players, positions) in
// memory. The Next.js app on Vercel never shares memory with it; instead the
// app's admin route proxies game creation here over HTTP, and player browsers
// connect to this server's Socket.IO endpoint directly.

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { existsSync, readFileSync } from "fs";
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./lib/types";

// --- Load .env for local dev (on Render, env vars come from the dashboard). ---
// Must run before importing anything that reads process.env (the Supabase
// client), so the Supabase-touching modules are imported dynamically below.
function loadDotenv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const port = parseInt(process.env.PORT || "4000", 10);
const corsOrigin = process.env.CLIENT_ORIGIN || "*";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

async function main() {
  loadDotenv();

  // Imported now (after env is loaded) so the Supabase client initializes OK.
  const { registerSocketServer } = await import("./server/socket");
  const { createGameRoom, CreateGameError } = await import(
    "./server/createGame"
  );
  const { store } = await import("./server/store");

  const httpServer = createServer(async (req, res) => {
    const url = req.url?.split("?")[0] ?? "/";

    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === "GET" && (url === "/" || url === "/health")) {
      sendJson(res, 200, { ok: true, service: "quiz-survival-socket" });
      return;
    }

    // GET /rooms — list currently active in-memory rooms (for the admin page).
    if (req.method === "GET" && url === "/rooms") {
      const rooms = [...store.rooms.values()]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((r) => ({
          roomId: r.roomId,
          title: r.title,
          theme: r.theme,
          gameState: r.gameState,
          players: Object.keys(r.players).length,
          maxPlayers: r.maxPlayers,
          questionCount: r.questionList.length,
          round: r.round,
          createdAt: r.createdAt,
        }));
      sendJson(res, 200, { rooms });
      return;
    }

    // POST /game/create — load quizzes from Supabase & create an in-memory room.
    if (req.method === "POST" && url === "/game/create") {
      // If a shared secret is configured, only accept requests carrying it
      // (i.e. from our Vercel admin proxy), closing the direct backdoor.
      const secret = process.env.SOCKET_ADMIN_SECRET;
      if (secret && req.headers["x-admin-secret"] !== secret) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
      try {
        const body = (await readJsonBody(req)) as Record<string, unknown>;
        const room = await createGameRoom({
          title: typeof body.title === "string" ? body.title : undefined,
          theme: typeof body.theme === "string" ? body.theme : "",
          questionCount:
            typeof body.questionCount === "number"
              ? body.questionCount
              : undefined,
          maxPlayers:
            typeof body.maxPlayers === "number" ? body.maxPlayers : undefined,
        });
        sendJson(res, 201, {
          roomId: room.roomId,
          title: room.title,
          theme: room.theme,
          maxPlayers: room.maxPlayers,
          questionCount: room.questionList.length,
        });
      } catch (err) {
        if (err instanceof CreateGameError) {
          sendJson(res, err.status, { error: err.message });
        } else {
          sendJson(res, 400, {
            error: err instanceof Error ? err.message : "Bad request",
          });
        }
      }
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      path: "/socket.io",
      cors: { origin: corsOrigin },
    }
  );

  registerSocketServer(io);

  httpServer.listen(port, () => {
    console.log(
      `> Quiz Survival socket server listening on :${port} (cors: ${corsOrigin})`
    );
  });
}

main().catch((err) => {
  console.error("Failed to start socket server:", err);
  process.exit(1);
});
