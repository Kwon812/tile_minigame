"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PLAYER_COLORS } from "@/lib/gameConfig";
import { difficultyLabel, listRooms, type RoomInfo } from "@/services/gameService";

/** Landing page: pick a nickname/color and join a waiting room. */
export default function HomeView() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState(0);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  // null = 확인 중. /api/admin/me 는 Basic Auth 게이트 뒤라, 로그인했으면 200.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      setRooms(await listRooms());
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
          <h2 className="text-lg font-semibold">
            참여 가능한 방 ({joinable.length})
          </h2>
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
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      {r.title}
                      {r.difficulty && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            r.difficulty === "hard"
                              ? "bg-rose-600/30 text-rose-300"
                              : "bg-sky-600/30 text-sky-300"
                          }`}
                        >
                          {difficultyLabel(r.difficulty)}
                        </span>
                      )}
                    </p>
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

      <div className="flex flex-col items-center gap-3">
        {/* 현재 사용자 상태 */}
        {isAdmin === null ? (
          <span className="text-xs text-slate-500">상태 확인 중…</span>
        ) : isAdmin ? (
          <span className="rounded-full bg-fuchsia-600/30 px-3 py-1 text-sm font-semibold text-fuchsia-300">
            선생님
          </span>
        ) : (
          <span className="rounded-full bg-slate-700 px-3 py-1 text-sm font-semibold text-slate-300">
            학생
          </span>
        )}

        {/* 일반 <a> = 전체 페이지 이동(navigate). 그래야 미로그인 시 /admin 에서
            브라우저 로그인 팝업이 뜸. (Next <Link>는 RSC fetch라 팝업이 안 뜸) */}
        {isAdmin ? (
          <a
            href="/admin"
            className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold transition hover:bg-fuchsia-500"
          >
            선생님 페이지 (문제 관리 · 게임 생성) →
          </a>
        ) : (
          <a
            href="/admin"
            className=" px-2 py-1 text-[13px]  font-semibold text-slate-200 transition hover:text-blue-300"
          >
            선생님 로그인
          </a>
        )}
        {isAdmin && (
          <span className="text-xs text-slate-500">
            게임 입장 시 관람 모드로 보여집니다
          </span>
        )}
      </div>
    </div>
  );
}
