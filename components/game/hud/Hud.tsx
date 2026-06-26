"use client";

import { ZONE_COLORS } from "@/lib/gameConfig";
import type { QuestionStartPayload, RoomPublicState } from "@/lib/types";

type Phase = "waiting" | "question" | "reveal" | "ended";

/** In-game heads-up display: top bar, question banner, answer legend, hints. */
export function Hud({
  room,
  spectator,
  muted,
  onToggleMute,
  phase,
  question,
  inCountdown,
  remaining,
  lowTime,
  options,
  correctAnswer,
  revealed,
  canMove,
  selfAlive,
  gameOver,
  aliveCount,
  playersCount,
}: {
  room: RoomPublicState;
  spectator: boolean;
  muted: boolean;
  onToggleMute: () => void;
  phase: Phase;
  question: QuestionStartPayload | null;
  inCountdown: boolean;
  remaining: number;
  lowTime: boolean;
  options: string[];
  correctAnswer: number | null;
  revealed: boolean;
  canMove: boolean;
  selfAlive: boolean;
  gameOver: boolean;
  aliveCount: number;
  playersCount: number;
}) {
  return (
    <>
      {/* Low-time red vignette */}
      {lowTime && (
        <div
          className="pointer-events-none absolute inset-0 z-10 animate-pulse"
          style={{ boxShadow: "inset 0 0 140px 30px rgba(239,68,68,0.55)" }}
        />
      )}

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
              생존 {aliveCount} / {playersCount}명
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={onToggleMute}
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
              const isCorrect = revealed && correctAnswer === i;
              const dim = revealed && !isCorrect;
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

        {!selfAlive && phase !== "waiting" && !gameOver && (
          <div className="mx-auto rounded-lg bg-red-900/70 px-4 py-2 text-sm font-semibold backdrop-blur">
            탈락했습니다 — 관전 중
          </div>
        )}
      </div>
    </>
  );
}
