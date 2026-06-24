"use client";

import { useState } from "react";
import Link from "next/link";
import GameClient from "./GameClient";
import { PLAYER_COLORS } from "@/lib/gameConfig";

export default function GameEntry({
  roomId,
  initialNick,
  initialColor,
}: {
  roomId: string;
  initialNick: string;
  initialColor: number;
}) {
  // If we arrived with a nickname (from the home page), go straight in.
  const [entered, setEntered] = useState(!!initialNick);
  const [nickname, setNickname] = useState(initialNick);
  const [draft, setDraft] = useState(initialNick);
  const [color, setColor] = useState(initialColor);

  if (entered && nickname) {
    return <GameClient roomId={roomId} nickname={nickname} color={color} />;
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <h1 className="text-2xl font-bold">캐릭터 설정</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = draft.trim();
          if (!v) return;
          setNickname(v);
          setEntered(true);
        }}
        className="flex flex-col items-center gap-4"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={16}
          placeholder="닉네임"
          className="w-64 rounded-lg bg-slate-800 px-4 py-3 text-center outline-none ring-sky-500 focus:ring-2"
        />

        <div>
          <p className="mb-2 text-center text-sm text-slate-400">캐릭터 색상</p>
          <div className="grid grid-cols-5 gap-2">
            {PLAYER_COLORS.map((c, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setColor(i)}
                aria-label={`색상 ${i + 1}`}
                className={`h-9 w-9 rounded-full transition ${
                  color === i
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950"
                    : "opacity-80 hover:opacity-100"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-64 rounded-lg bg-sky-600 py-3 font-semibold transition hover:bg-sky-500"
        >
          방 {roomId} 입장
        </button>
      </form>
      <Link href="/" className="text-sm text-slate-400 hover:text-white">
        홈으로
      </Link>
    </div>
  );
}
