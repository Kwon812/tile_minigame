"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import Scene from "./Arena";
import { useGameSocket } from "@/lib/useGameSocket";
import { PLAYER_COLORS, ZONE_COLORS } from "@/lib/gameConfig";
import { sfx, setMuted } from "@/lib/sound";

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.2 + Math.random() * 1.8,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        rot: Math.random() * 360,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rot}deg)`,
            borderRadius: i % 2 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

function useCountdown(endsAt: number | undefined) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

/** Pre-round 3·2·1·GO. Returns 3/2/1 while counting, 0 during the GO flash, null otherwise. */
function useRoundStart(startsAt: number | undefined) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!startsAt) {
      setCount(null);
      return;
    }
    const update = () => {
      const ms = startsAt - Date.now();
      if (ms > 0) setCount(Math.ceil(ms / 1000));
      else if (ms > -800) setCount(0);
      else setCount(null);
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [startsAt]);
  return count;
}

export default function GameClient({
  roomId,
  nickname,
  color,
  spectator = false,
}: {
  roomId: string;
  nickname: string;
  color: number;
  spectator?: boolean;
}) {
  const game = useGameSocket(roomId, nickname, color, spectator);
  const {
    status,
    error,
    selfId,
    room,
    players,
    question,
    reveal,
    gameEnd,
    startGame,
    sendMove,
  } = game;

  const remaining = useCountdown(question?.endsAt);
  const count = useRoundStart(question?.startsAt);
  const inCountdown = count !== null && count > 0;

  const self = players.find((p) => p.id === selfId) ?? null;
  const aliveCount = players.filter((p) => p.alive).length;

  // Derive the phase from events we actually receive. The server only pushes
  // `roomState` on join/disconnect/end, so `room.gameState` stays "waiting"
  // through gameplay — we must not key the UI off it.
  const phase: "waiting" | "question" | "reveal" | "ended" = gameEnd
    ? "ended"
    : reveal
    ? "reveal"
    : question
    ? "question"
    : "waiting";
  const canMove =
    phase === "question" &&
    reveal === null &&
    !!self?.alive &&
    !gameEnd &&
    !inCountdown;

  // Board phase: study (countdown — colors shown), act (moving — gray), reveal.
  const tileMode: "study" | "act" | "reveal" = reveal
    ? "reveal"
    : phase === "question" && !inCountdown
    ? "act"
    : "study";

  const options = useMemo(
    () => question?.question.options ?? [],
    [question]
  );

  // Render with the CURRENT round's board (reshuffled each round and sent via
  // questionStart). room.arena is only the initial/waiting layout — using it
  // would desync the tiles you see from the tiles the server judges.
  const arena = question?.arena ?? room?.arena ?? null;

  // ---- game juice: sound + flashes ----
  const [muted, setMutedState] = useState(false);
  const [revealAt, setRevealAt] = useState<number | null>(null);

  // Answer reveal: trigger camera impact + chime (+ whoosh if anyone dropped).
  useEffect(() => {
    if (reveal) {
      setRevealAt(Date.now());
      sfx.reveal();
      if (reveal.eliminatedPlayerIds.length > 0) sfx.eliminate();
    } else {
      setRevealAt(null);
    }
  }, [reveal]);

  // 3·2·1 countdown beeps, then "GO".
  useEffect(() => {
    if (count === null) return;
    if (count > 0) sfx.tick();
    else sfx.go();
  }, [count]);

  // Falling whoosh the moment I drop into a hole mid-round.
  const prevAlive = useRef(true);
  useEffect(() => {
    const aliveNow = !!self?.alive;
    if (prevAlive.current && !aliveNow && phase === "question") sfx.eliminate();
    prevAlive.current = aliveNow;
  }, [self?.alive, phase]);

  // Game over: fanfare or losing tone.
  useEffect(() => {
    if (!gameEnd) return;
    if (gameEnd.winners.length > 0) sfx.win();
    else sfx.lose();
  }, [gameEnd]);

  // Countdown ticks for the final seconds.
  useEffect(() => {
    if (phase === "question" && remaining > 0 && remaining <= 5) sfx.tick();
  }, [remaining, phase]);

  const lowTime = phase === "question" && remaining > 0 && remaining <= 5;
  const eliminatedThisRound = reveal?.eliminatedPlayerIds.length ?? 0;

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    sfx.unlock();
  };

  const handleStart = () => {
    sfx.unlock();
    startGame();
  };

  if (status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p className="text-xl font-semibold text-red-400">{error}</p>
        <Link href="/" className="rounded-lg bg-sky-600 px-4 py-2">
          홈으로
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p className="animate-pulse text-lg">접속 중…</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <Canvas shadows camera={{ position: [0, 20, 20], fov: 50 }}>
        <Scene
          arena={arena ?? room.arena}
          players={players}
          selfId={selfId}
          canMove={canMove}
          correctAnswer={reveal ? reveal.correctAnswer : null}
          tileMode={tileMode}
          revealAt={revealAt}
          spectator={spectator}
          onMove={sendMove}
        />
      </Canvas>

      {/* Low-time red vignette */}
      {lowTime && (
        <div
          className="pointer-events-none absolute inset-0 z-10 animate-pulse"
          style={{ boxShadow: "inset 0 0 140px 30px rgba(239,68,68,0.55)" }}
        />
      )}

      {/* Round-start 3·2·1·GO countdown */}
      {count !== null && phase !== "ended" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div key={count} className="go-pop text-center">
            {question && (
              <div className="mb-1 text-2xl font-bold text-sky-300">
                라운드 {question.round} / {question.totalRounds}
              </div>
            )}
            {count > 0 ? (
              <>
                <div className="text-[10rem] font-extrabold leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  {count}
                </div>
                <div className="mt-2 text-xl font-bold text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  색과 구멍 위치를 외우세요!
                </div>
              </>
            ) : (
              <div className="text-8xl font-extrabold text-sky-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                GO!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Answer reveal banner */}
      {phase === "reveal" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="banner-pop rounded-2xl bg-black/70 px-8 py-4 text-center backdrop-blur">
            {eliminatedThisRound > 0 ? (
              <span className="text-4xl font-extrabold text-red-400">
                💥 {eliminatedThisRound}명 탈락!
              </span>
            ) : (
              <span className="text-4xl font-extrabold text-green-400">
                ✅ 전원 생존!
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---- HUD ---- */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col p-4 text-white">
        {/* Top bar */}
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-black/50 px-3 py-2 text-sm backdrop-blur">
            <div className="flex items-center gap-2 font-semibold">
              {room.title}
              {spectator && (
                <span className="rounded-full bg-fuchsia-600 px-2 py-0.5 text-xs">
                  👁 관람 모드
                </span>
              )}
            </div>
            <div className="text-slate-300">테마: {room.theme}</div>
            <div className="text-slate-300">
              생존 {aliveCount} / {players.length}명
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={toggleMute}
              className="pointer-events-auto rounded-lg bg-black/50 px-3 py-1.5 text-sm backdrop-blur transition hover:bg-black/70"
              aria-label="소리 켜기/끄기"
            >
              {muted ? "🔇" : "🔊"}
            </button>
            {phase === "question" && question && !inCountdown && (
              <div className="rounded-lg bg-black/50 px-4 py-2 text-center backdrop-blur">
                <div className="text-xs text-slate-300">
                  라운드 {question.round} / {question.totalRounds}
                </div>
                <div
                  className={`text-3xl font-bold ${
                    remaining <= 5 ? "animate-pulse text-red-400" : "text-sky-300"
                  }`}
                >
                  {remaining}s
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question banner */}
        {question && (phase === "question" || phase === "reveal") && (
          <div className="mx-auto mt-2 max-w-2xl rounded-xl bg-black/60 px-6 py-3 text-center text-xl font-semibold backdrop-blur">
            {question.question.question}
          </div>
        )}

        {/* Color ↔ option legend (tiles are scattered, so this maps color→답) */}
        {question && (phase === "question" || phase === "reveal") && (
          <div className="mx-auto mt-2 flex max-w-2xl flex-wrap justify-center gap-2">
            {options.map((opt, i) => {
              const isCorrect = reveal?.correctAnswer === i;
              const dim = reveal !== null && !isCorrect;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium backdrop-blur transition ${
                    isCorrect
                      ? "bg-white/90 text-black ring-2 ring-white"
                      : "bg-black/55 text-white"
                  } ${dim ? "opacity-40" : ""}`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded"
                    style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }}
                  />
                  {i + 1}. {opt}
                  {isCorrect && " ✓"}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* Bottom: controls hint */}
        {canMove && (
          <div className="mx-auto rounded-lg bg-black/50 px-4 py-2 text-sm text-slate-200 backdrop-blur">
            기억으로 정답 색 타일까지! (타일이 회색이라 위치를 외워야 해요 ·
            구멍 주의)
          </div>
        )}

        {!self?.alive && phase !== "waiting" && !gameEnd && (
          <div className="mx-auto rounded-lg bg-red-900/70 px-4 py-2 text-sm font-semibold backdrop-blur">
            탈락했습니다 — 관전 중
          </div>
        )}
      </div>

      {/* Waiting room overlay */}
      {phase === "waiting" && !gameEnd && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
            <h2 className="text-2xl font-bold">{room.title}</h2>
            <p className="mb-4 mt-1 text-sm text-slate-400">
              대기실 · 테마 {room.theme} · 최대 {room.maxPlayers}명 ·{" "}
              {room.totalRounds}라운드
            </p>
            <div className="mb-4 max-h-48 space-y-1 overflow-auto">
              {players.map((p) => {
                const isSelf = p.id === selfId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                      isSelf
                        ? "border-2 border-sky-400 bg-sky-500/20 font-semibold text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                        : "border-2 border-transparent bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          background:
                            PLAYER_COLORS[p.color % PLAYER_COLORS.length],
                        }}
                      />
                      {isSelf && <span aria-hidden>👉</span>}
                      {p.nickname}
                    </span>
                    {isSelf && (
                      <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs font-bold text-white">
                        나
                      </span>
                    )}
                  </div>
                );
              })}
              {players.length === 0 && (
                <p className="text-sm text-slate-500">참가자 없음</p>
              )}
            </div>
            {spectator ? (
              <button
                onClick={handleStart}
                disabled={players.length === 0}
                className="w-full rounded-lg bg-fuchsia-600 py-3 font-semibold transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                게임 시작 (관리자)
              </button>
            ) : (
              <p className="rounded-lg bg-slate-800 py-3 text-center text-sm text-slate-400">
                관리자가 시작하기를 기다리는 중…
              </p>
            )}
            <p className="mt-2 text-center text-xs text-slate-500">
              친구에게 이 페이지 URL을 공유하세요
            </p>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {gameEnd && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          {gameEnd.winners.length > 0 && <Confetti />}
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 p-8 text-center text-white shadow-xl">
            <h2 className="mb-2 text-3xl font-bold">게임 종료</h2>
            {gameEnd.winners.length === 1 ? (
              <p className="mb-6 text-xl">
                🏆 우승:{" "}
                <span className="font-bold text-yellow-400">
                  {gameEnd.winners[0].nickname}
                </span>
                {gameEnd.winners[0].id === selfId && " (나!)"}
              </p>
            ) : gameEnd.winners.length > 1 ? (
              <div className="mb-6">
                <p className="mb-2 text-xl">
                  🤝 공동 생존 {gameEnd.winners.length}명
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameEnd.winners.map((w) => (
                    <span
                      key={w.id}
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        w.id === selfId
                          ? "bg-yellow-400 text-black"
                          : "bg-slate-700 text-yellow-300"
                      }`}
                    >
                      {w.nickname}
                      {w.id === selfId && " (나)"}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mb-6 text-xl text-slate-300">생존자가 없습니다</p>
            )}
            <Link
              href="/"
              className="inline-block rounded-lg bg-sky-600 px-6 py-3 font-semibold transition hover:bg-sky-500"
            >
              홈으로
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
