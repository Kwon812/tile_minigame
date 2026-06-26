"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  GameEndPayload,
  PlayerView,
  QuestionStartPayload,
  RevealAnswerPayload,
  RoomPublicState,
  RoundResultPayload,
  ServerToClientEvents,
} from "@/lib/types";

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnStatus = "connecting" | "joining" | "joined" | "error";

export interface GameSocketState {
  status: ConnStatus;
  error: string | null;
  /** serverNow ≈ Date.now() + serverOffset. Add it before comparing against
   *  any server timestamp (startsAt/endsAt) so countdowns match across clients
   *  whose system clocks differ from the server. */
  serverOffset: number;
  selfId: string | null;
  room: RoomPublicState | null;
  players: PlayerView[];
  question: QuestionStartPayload | null;
  reveal: RevealAnswerPayload | null;
  roundResult: RoundResultPayload | null;
  gameEnd: GameEndPayload | null;
}

export interface GameSocketApi extends GameSocketState {
  startGame: () => void;
  sendMove: (x: number, y: number, z: number, rotationY: number) => void;
}

export function useGameSocket(
  roomId: string,
  nickname: string,
  color: number,
  spectator = false
): GameSocketApi {
  const socketRef = useRef<ClientSocket | null>(null);

  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  // Smallest round-trip seen so far — its sample gives the most accurate offset.
  const bestRttRef = useRef(Infinity);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [players, setPlayers] = useState<PlayerView[]>([]);
  const [question, setQuestion] = useState<QuestionStartPayload | null>(null);
  const [reveal, setReveal] = useState<RevealAnswerPayload | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResultPayload | null>(
    null
  );
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);

  useEffect(() => {
    if (!roomId || !nickname) return;

    // Connect to the standalone socket server (Render). Falls back to same
    // origin for local all-in-one setups.
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket: ClientSocket = io(socketUrl, { path: "/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("joining");
      socket.emit("joinRoom", { roomId, nickname, color, spectator });

      // Kick off a short burst of clock-sync pings; keep the best (lowest-RTT)
      // estimate. Re-syncs periodically to absorb clock drift.
      bestRttRef.current = Infinity;
      for (let i = 0; i < 5; i++) {
        setTimeout(() => socket.emit("timeSync", Date.now()), i * 250);
      }
    });

    socket.on("timeSyncResult", ({ clientSent, serverTime }) => {
      const now = Date.now();
      const rtt = now - clientSent;
      if (rtt < bestRttRef.current) {
        bestRttRef.current = rtt;
        // Server time at the round-trip midpoint maps to (clientSent + rtt/2).
        setServerOffset(serverTime - (clientSent + rtt / 2));
      }
    });

    socket.on("joined", (state) => {
      setSelfId(state.selfId);
      setRoom(state);
      setPlayers(state.players);
      setStatus("joined");
    });

    socket.on("joinError", (message) => {
      setError(message);
      setStatus("error");
    });

    socket.on("roomState", (state) => {
      setRoom(state);
      setPlayers(state.players);
    });

    socket.on("gameStart", () => {
      setQuestion(null);
      setReveal(null);
      setRoundResult(null);
      setGameEnd(null);
    });

    socket.on("questionStart", (payload) => {
      setQuestion(payload);
      setReveal(null);
      setRoundResult(null);
    });

    socket.on("playersUpdate", (list) => setPlayers(list));

    socket.on("revealAnswer", (payload) => {
      setReveal(payload);
      // Reflect eliminations so the renderer can drop those characters.
      setPlayers((prev) =>
        prev.map((p) =>
          payload.eliminatedPlayerIds.includes(p.id)
            ? { ...p, alive: false }
            : p
        )
      );
    });
    socket.on("roundResult", (payload) => setRoundResult(payload));
    socket.on("nextRound", () => {
      setReveal(null);
      setRoundResult(null);
    });
    socket.on("gameEnd", (payload) => setGameEnd(payload));

    socket.on("disconnect", () => {
      setStatus((s) => (s === "joined" ? "connecting" : s));
    });

    // Re-sync every 30s so long sessions don't accumulate clock drift.
    const syncTimer = setInterval(() => {
      if (socket.connected) socket.emit("timeSync", Date.now());
    }, 30_000);

    return () => {
      clearInterval(syncTimer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, nickname, color, spectator]);

  const startGame = useCallback(() => {
    socketRef.current?.emit("startGame");
  }, []);

  const sendMove = useCallback(
    (x: number, y: number, z: number, rotationY: number) => {
      socketRef.current?.emit("playerMove", { x, y, z, rotationY });
    },
    []
  );

  return {
    status,
    error,
    serverOffset,
    selfId,
    room,
    players,
    question,
    reveal,
    roundResult,
    gameEnd,
    startGame,
    sendMove,
  };
}
