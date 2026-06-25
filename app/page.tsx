"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PLAYER_COLORS } from "@/lib/gameConfig";

interface RoomInfo {
  roomId: string;
  title: string;
  theme: string;
  gameState: string;
  players: number;
  maxPlayers: number;
  questionCount: number;
}

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState(0);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
    const id = setInterval(loadRooms, 4000); // keep the list fresh
    return () => clearInterval(id);
  }, [loadRooms]);

  const join = (roomId: string) => {
    const nick = nickname.trim();
    if (!nick) {
      alert("닉네임을 먼저 입력하세요.");
      return;
    }
    router.push(
      `/game/${encodeURIComponent(roomId)}?nick=${encodeURIComponent(
        nick
      )}&color=${color}`
    );
  };

  // 대기 중인 방만 입장 가능.
  const joinable = rooms.filter((r) => r.gameState === "waiting");

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-16 text-white">
      <div className="text-center">
        <h1 className="bg-gradient-to-r from-sky-400 to-fuchsia-500 bg-clip-text text-5xl font-extrabold text-transparent">
          Quiz Survival Arena
        </h1>
        <p className="mt-3 text-slate-400">
          제한 시간 안에 정답 타일 위로! 마지막 1인이 승리합니다.
        </p>
      </div>

      <div className="w-full max-w-md">
        <label className="mb-1 block text-sm text-slate-300">닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={16}
          placeholder="플레이어"
          className="w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-sky-500 focus:ring-2"
        />

        <label className="mt-3 mb-1 block text-sm text-slate-300">
          캐릭터 색상
        </label>
        <div className="flex flex-wrap gap-2">
          {PLAYER_COLORS.map((c, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setColor(i)}
              aria-label={`색상 ${i + 1}`}
              className={`h-8 w-8 rounded-full transition ${
                color === i
                  ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                  : "opacity-80 hover:opacity-100"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">참여 가능한 방 ({joinable.length})</h2>
          <button
            onClick={loadRooms}
            className="text-xs text-slate-400 hover:text-white"
          >
            새로고침 ⟳
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">불러오는 중…</p>
        ) : joinable.length === 0 ? (
          <div className="rounded-xl bg-slate-800/60 p-6 text-center text-sm text-slate-400">
            현재 열린 방이 없습니다.
          </div>
        ) : (
          <ul className="space-y-2">
            {joinable.map((r) => {
              const full = r.players >= r.maxPlayers;
              return (
                <li
                  key={r.roomId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-xs text-slate-400">
                      <span className="text-fuchsia-300">{r.theme}</span> ·{" "}
                      {r.questionCount}문제 · {r.players}/{r.maxPlayers}명
                    </p>
                  </div>
                  <button
                    onClick={() => join(r.roomId)}
                    disabled={full}
                    className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    {full ? "가득 참" : "입장"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Link
        href="/admin"
        className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
      >
        관리자 페이지 (문제 관리 · 게임 생성)
      </Link>
    </div>
  );
}
