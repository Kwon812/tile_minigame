// Socket.IO wiring: connection lifecycle, joining rooms, movement sync.
import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../lib/types";
import { arenaBounds, clampColorIndex } from "../lib/gameConfig";
import { store, toPlayerView, toPublicState } from "./store";
import { startGame } from "./gameEngine";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Clamp a player's claimed position to the arena so they can't teleport out. */
function clampToArena(
  x: number,
  z: number,
  arena: ReturnType<typeof toPublicState>["arena"]
) {
  const b = arenaBounds(arena);
  return {
    x: Math.min(b.maxX, Math.max(b.minX, x)),
    z: Math.min(b.maxZ, Math.max(b.minZ, z)),
  };
}

export function registerSocketServer(io: IO) {
  io.on("connection", (socket: GameSocket) => {
    // Which room this socket belongs to (set on joinRoom).
    let joinedRoomId: string | null = null;

    socket.on("joinRoom", ({ roomId, nickname, color }) => {
      const room = store.getRoom(roomId);
      if (!room) {
        socket.emit("joinError", "존재하지 않는 방입니다.");
        return;
      }
      if (room.gameState !== "waiting") {
        socket.emit("joinError", "이미 시작된 게임입니다.");
        return;
      }
      if (Object.keys(room.players).length >= room.maxPlayers) {
        socket.emit("joinError", "방이 가득 찼습니다.");
        return;
      }

      const clean = (nickname || "Player").trim().slice(0, 16) || "Player";
      room.players[socket.id] = {
        id: socket.id,
        nickname: clean,
        color: clampColorIndex(color),
        x: 0,
        y: 0,
        z: arenaBounds(room.arena).maxZ - room.arena.tileSize / 2,
        rotationY: 0,
        alive: true,
        connected: true,
      };

      joinedRoomId = roomId;
      socket.join(roomId);

      socket.emit("joined", { ...toPublicState(room), selfId: socket.id });
      io.to(roomId).emit("roomState", toPublicState(room));
    });

    socket.on("startGame", () => {
      if (!joinedRoomId) return;
      startGame(io, joinedRoomId);
    });

    socket.on("playerMove", ({ x, y, z, rotationY }) => {
      if (!joinedRoomId) return;
      const room = store.getRoom(joinedRoomId);
      if (!room) return;
      const player = room.players[socket.id];
      // Only living players during an active question can move — and only after
      // the 3·2·1 countdown has finished.
      if (!player || !player.alive || room.gameState !== "question") return;
      if (room.startsAt && Date.now() < room.startsAt) return;

      const clamped = clampToArena(x, z, room.arena);
      player.x = clamped.x;
      player.z = clamped.z;
      player.y = typeof y === "number" ? y : 0;
      player.rotationY = rotationY ?? 0;
      // Holes are NOT instant death anymore — judged at timer end in endRound
      // (a player standing on a hole tile, zone -1, fails the answer check).
    });

    socket.on("disconnect", () => {
      if (!joinedRoomId) return;
      const room = store.getRoom(joinedRoomId);
      if (!room) return;
      const player = room.players[socket.id];
      if (!player) return;

      if (room.gameState === "waiting") {
        // Not started yet — just drop them.
        delete room.players[socket.id];
      } else {
        // Mid-game: mark disconnected & eliminate so the round can resolve.
        player.connected = false;
        player.alive = false;
      }
      io.to(joinedRoomId).emit("roomState", toPublicState(room));
    });
  });

  // Broadcast every room's latest authoritative positions at the spec's 100ms
  // cadence (10 updates/sec) only while a question is live.
  setInterval(() => {
    for (const room of store.rooms.values()) {
      if (room.gameState !== "question") continue;
      io.to(room.roomId).emit(
        "playersUpdate",
        Object.values(room.players).map(toPlayerView)
      );
    }
  }, 100);
}
