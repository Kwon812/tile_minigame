"use client";

import Link from "next/link";
import type { GameEndPayload } from "@/lib/types";
import { Confetti } from "./Confetti";

/** End-of-game overlay: winner(s) + return-home link. */
export function GameOverOverlay({
  gameEnd,
  selfId,
}: {
  gameEnd: GameEndPayload;
  selfId: string | null;
}) {
  return (
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
  );
}
