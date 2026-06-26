// Game/room service — talks to the socket server via same-origin proxy routes.
// `/api/rooms` (public list) and `/api/admin/game/create`.

/** Live room as exposed by the socket server's room list. `round` is only
 *  present in the admin view. */
export interface RoomInfo {
  roomId: string;
  title: string;
  theme: string;
  gameState: string;
  players: number;
  maxPlayers: number;
  questionCount: number;
  round?: number;
  difficulty?: GameDifficulty;
}

import type { GameDifficulty } from "@/lib/types";

/** Korean label for a board difficulty (empty when unknown). */
export const difficultyLabel = (d: GameDifficulty | undefined) =>
  d === "hard" ? "어려움" : d === "normal" ? "노말" : "";

export interface CreateGameInput {
  title: string;
  theme: string;
  questionCount: number;
  maxPlayers: number;
  difficulty: GameDifficulty;
}

export interface CreateGameResult {
  roomId: string;
  title: string;
}

export async function listRooms(): Promise<RoomInfo[]> {
  const res = await fetch("/api/rooms");
  const data = await res.json();
  return data.rooms ?? [];
}

/** Throws Error(message) on failure so callers can surface `err.message`. */
export async function createGame(
  input: CreateGameInput
): Promise<CreateGameResult> {
  const res = await fetch("/api/admin/game/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error ?? "게임 생성 실패");
  return d;
}
