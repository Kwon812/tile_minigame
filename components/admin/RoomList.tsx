"use client";

import Link from "next/link";
import { difficultyLabel, type RoomInfo } from "@/services/gameService";

/** Live active-room list with copy-link / open actions. */
export function RoomList({
  rooms,
  onReload,
  onMessage,
}: {
  rooms: RoomInfo[];
  onReload: () => void;
  onMessage: (m: string) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          활성 방 ({rooms.length}) — 여러 방을 동시에 운영할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={onReload}
          className="text-xs text-slate-400 hover:text-white"
        >
          새로고침 ⟳
        </button>
      </div>
      {rooms.length === 0 ? (
        <p className="text-sm text-slate-500">
          활성화된 방이 없습니다. (게임 종료 15초 후 자동 정리됩니다)
        </p>
      ) : (
        rooms.map((r) => (
          <div
            key={r.roomId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-800 p-3 text-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{r.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    r.gameState === "waiting"
                      ? "bg-amber-600/30 text-amber-300"
                      : r.gameState === "ended"
                      ? "bg-slate-600 text-slate-300"
                      : "bg-green-600/30 text-green-300"
                  }`}
                >
                  {r.gameState}
                </span>
                {r.difficulty && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.difficulty === "hard"
                        ? "bg-rose-600/30 text-rose-300"
                        : "bg-sky-600/30 text-sky-300"
                    }`}
                  >
                    {difficultyLabel(r.difficulty)}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                <span className="font-mono text-sky-300">{r.roomId}</span> ·{" "}
                {r.theme} · {r.questionCount}문제 · 인원 {r.players}/
                {r.maxPlayers}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${location.origin}/game/${r.roomId}`
                  );
                  onMessage(`방 ${r.roomId} 링크를 복사했습니다.`);
                }}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700"
              >
                링크 복사
              </button>
              <Link
                href={`/game/${r.roomId}`}
                className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-fuchsia-500"
              >
                방 열기 →
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
