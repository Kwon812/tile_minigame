// Authoritative in-memory game store.
//
// Rooms and players live ONLY here (never in the database). This module is
// loaded only by the standalone Socket.IO server (Render), which runs as a
// single process — so a plain module-level singleton is all we need. (The Vercel
// app never imports this; it proxies game creation/listing over HTTP.)

import type {
  ArenaConfig,
  GameState,
  Player,
  PlayerView,
  Quiz,
  RoomPublicState,
} from "../lib/types";
import { makeArena } from "../lib/gameConfig";

export interface RoomRuntime {
  roomId: string;
  title: string;
  theme: string;
  maxPlayers: number;
  /** Full quizzes incl. correct answers — server-only, never sent to clients. */
  questionList: Quiz[];
  /** 1-based current round number. */
  round: number;
  /** Index into questionList for the active question. */
  currentQuestionIndex: number;
  players: Record<string, Player>;
  gameState: GameState;
  arena: ArenaConfig;
  /** Active round/intermission timer, if any. */
  timer?: ReturnType<typeof setTimeout>;
  /** Epoch ms when movement begins (after the countdown). */
  startsAt?: number;
  /** Epoch ms when the current question phase ends. */
  endsAt?: number;
  createdAt: number;
}

class GameStore {
  rooms = new Map<string, RoomRuntime>();
  private counter = 0;

  createRoom(opts: {
    title?: string;
    theme: string;
    maxPlayers: number;
    questionList: Quiz[];
  }): RoomRuntime {
    this.counter += 1;
    const roomId = `room_${this.counter}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    // Arena is shaped by the first question's option count (quizzes in a theme
    // are assumed consistent; we clamp to the first question's choices).
    const optionCount = opts.questionList[0]?.options.length ?? 4;

    const room: RoomRuntime = {
      roomId,
      title: opts.title?.trim() || opts.theme,
      theme: opts.theme,
      maxPlayers: opts.maxPlayers,
      questionList: opts.questionList,
      round: 0,
      currentQuestionIndex: -1,
      players: {},
      gameState: "waiting",
      arena: makeArena(optionCount),
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): RoomRuntime | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room?.timer) clearTimeout(room.timer);
    this.rooms.delete(roomId);
  }
}

// Single in-memory store for the socket-server process.
export const store = new GameStore();

// ---- view helpers ----

export function toPlayerView(p: Player): PlayerView {
  return {
    id: p.id,
    nickname: p.nickname,
    color: p.color,
    x: p.x,
    y: p.y,
    z: p.z,
    rotationY: p.rotationY,
    alive: p.alive,
    connected: p.connected,
  };
}

export function toPublicState(room: RoomRuntime): RoomPublicState {
  return {
    roomId: room.roomId,
    title: room.title,
    theme: room.theme,
    maxPlayers: room.maxPlayers,
    round: room.round,
    totalRounds: room.questionList.length,
    gameState: room.gameState,
    players: Object.values(room.players).map(toPlayerView),
    arena: room.arena,
  };
}
