"use client";

import { PLAYER_COLORS } from "@/lib/gameConfig";
import type { PlayerView, RoomPublicState } from "@/lib/types";

/** Pre-game lobby overlay: roster + start button (admins only). */
export function WaitingRoom({
  room,
  players,
  selfId,
  spectator,
  onStart,
}: {
  room: RoomPublicState;
  players: PlayerView[];
  selfId: string | null;
  spectator: boolean;
  onStart: () => void;
}) {
  return (
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
                      background: PLAYER_COLORS[p.color % PLAYER_COLORS.length],
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
            onClick={onStart}
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
  );
}
