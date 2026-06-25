// Server-authoritative round/game loop. The client can never decide who
// survives — judgement is computed here from server-stored positions.

import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../lib/types";
import {
  ROUND_DURATION_MS,
  COUNTDOWN_MS,
  INTERMISSION_MS,
  arenaBounds,
  generateTileZones,
  roundGrid,
  zoneFromPosition,
} from "../lib/gameConfig";
import { store, toPlayerView, toPublicState, type RoomRuntime } from "./store";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

/** How long after a game ends before the room is torn down. */
const CLEANUP_DELAY_MS = 15_000;

function alivePlayers(room: RoomRuntime) {
  return Object.values(room.players).filter((p) => p.alive);
}

/** Place every still-alive player at a neutral back-row spawn for a fresh round. */
function respawnAlive(room: RoomRuntime) {
  const { minX, maxX, maxZ } = arenaBounds(room.arena);
  const half = room.arena.tileSize / 2;
  const alive = alivePlayers(room);
  alive.forEach((p, i) => {
    // Spread players along X near center (clamped to the board, which shrinks).
    p.x = Math.min(
      maxX - half,
      Math.max(minX + half, (i - (alive.length - 1) / 2) * 0.8)
    );
    p.z = maxZ - half;
    p.y = 0;
    p.rotationY = 0;
  });
}

export function startGame(io: IO, roomId: string) {
  const room = store.getRoom(roomId);
  if (!room) return;
  if (room.gameState !== "waiting") return;
  if (Object.keys(room.players).length === 0) return;

  // Everyone starts alive.
  for (const p of Object.values(room.players)) p.alive = true;

  io.to(roomId).emit("gameStart");
  beginRound(io, roomId);
}

function beginRound(io: IO, roomId: string) {
  const room = store.getRoom(roomId);
  if (!room) return;

  room.round += 1;
  room.currentQuestionIndex += 1;
  room.gameState = "question";

  const quiz = room.questionList[room.currentQuestionIndex];
  // Shape the board to THIS question's option count (questions may differ),
  // shrink it as rounds progress, and reshuffle the colored tiles each round.
  const optionCount = quiz.options.length;
  const { cols, rows } = roundGrid(room.round, optionCount);
  room.arena = {
    ...room.arena,
    optionCount,
    cols,
    rows,
    tileZones: generateTileZones(cols, rows, optionCount),
  };
  respawnAlive(room);

  // 3·2·1 countdown, then the round timer runs for ROUND_DURATION_MS.
  const startsAt = Date.now() + COUNTDOWN_MS;
  const endsAt = startsAt + ROUND_DURATION_MS;
  room.startsAt = startsAt;
  room.endsAt = endsAt;

  io.to(roomId).emit("questionStart", {
    round: room.round,
    totalRounds: room.questionList.length,
    question: { question: quiz.question, options: quiz.options }, // no answer!
    duration: ROUND_DURATION_MS,
    startsAt,
    endsAt,
    arena: room.arena,
  });
  // Push the respawned positions so clients render players at the start line.
  io.to(roomId).emit(
    "playersUpdate",
    Object.values(room.players).map(toPlayerView)
  );

  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(
    () => endRound(io, roomId),
    COUNTDOWN_MS + ROUND_DURATION_MS
  );
}

function endRound(io: IO, roomId: string) {
  const room = store.getRoom(roomId);
  if (!room) return;

  room.gameState = "reveal";
  const quiz = room.questionList[room.currentQuestionIndex];
  const correctAnswer = quiz.correct_answer;

  // Authoritative judgement from the server's stored positions.
  const eliminated: string[] = [];
  for (const p of Object.values(room.players)) {
    if (!p.alive) continue;
    const zone = zoneFromPosition(p.x, p.z, room.arena);
    if (zone !== correctAnswer) {
      p.alive = false;
      eliminated.push(p.id);
    }
  }

  io.to(roomId).emit("revealAnswer", { correctAnswer, eliminatedPlayerIds: eliminated });
  io.to(roomId).emit("roundResult", {
    round: room.round,
    alive: alivePlayers(room).map(toPlayerView),
    eliminated: eliminated
      .map((id) => room.players[id])
      .filter(Boolean)
      .map(toPlayerView),
  });

  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => advance(io, roomId), INTERMISSION_MS);
}

function advance(io: IO, roomId: string) {
  const room = store.getRoom(roomId);
  if (!room) return;

  const alive = alivePlayers(room);
  const hasMoreQuestions =
    room.currentQuestionIndex < room.questionList.length - 1;

  // End when only one (or zero) survivor remains, or we've run out of questions.
  if (alive.length <= 1 || !hasMoreQuestions) {
    endGame(io, roomId);
    return;
  }

  room.gameState = "intermission";
  io.to(roomId).emit("nextRound", room.round + 1);
  beginRound(io, roomId);
}

function endGame(io: IO, roomId: string) {
  const room = store.getRoom(roomId);
  if (!room) return;

  room.gameState = "ended";
  // Everyone still alive at game end wins. One survivor → solo winner; several
  // (questions ran out with multiple alive) → co-winners; none → no winner.
  const winners = alivePlayers(room).map(toPlayerView);
  const winner = winners.length === 1 ? winners[0] : null;

  io.to(roomId).emit("gameEnd", { winner, winners });
  io.to(roomId).emit("roomState", toPublicState(room));

  // Clean the room up shortly after so memory doesn't leak (spec §16 Reliability).
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => store.deleteRoom(roomId), CLEANUP_DELAY_MS);
}
