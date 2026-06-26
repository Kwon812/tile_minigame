"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Quiz } from "@/lib/types";
import { createGame } from "@/services/gameService";

/** Game-creation form + selected-theme question preview. Owns its own draft
 *  state; reads quizzes/themes from the dashboard. */
export function GameCreateForm({
  quizzes,
  themes,
  activeCount,
  onMessage,
  onCreated,
}: {
  quizzes: Quiz[];
  themes: string[];
  activeCount: (theme: string) => number;
  onMessage: (m: string) => void;
  onCreated: () => void;
}) {
  // string-backed so the fields can be cleared/retyped freely
  const [gameTitle, setGameTitle] = useState("");
  const [gameTheme, setGameTheme] = useState("딥페이크");
  const [questionCount, setQuestionCount] = useState("10");
  const [maxPlayers, setMaxPlayers] = useState("30");
  const [creating, setCreating] = useState(false);

  const availableCount = activeCount(gameTheme);
  const themeActiveQuizzes = quizzes.filter(
    (q) => q.theme === gameTheme && q.is_active
  );

  // Keep the selected game theme valid as the quiz set changes.
  useEffect(() => {
    if (themes.length > 0 && !themes.includes(gameTheme)) {
      setGameTheme(themes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes]);

  // Sync the question count to the number of active questions that theme has.
  useEffect(() => {
    setQuestionCount(String(availableCount > 0 ? availableCount : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTheme, availableCount]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      // Clamp on submit: question count to [1, available], players to >= 1.
      const qc = Math.min(
        Math.max(1, parseInt(questionCount, 10) || 1),
        Math.max(1, availableCount)
      );
      const mp = Math.max(1, parseInt(maxPlayers, 10) || 1);
      const result = await createGame({
        title: gameTitle.trim() || gameTheme,
        theme: gameTheme,
        questionCount: qc,
        maxPlayers: mp,
      });
      onMessage(`"${result.title}" 방 생성됨 (${result.roomId})`);
      setGameTitle("");
      onCreated();
    } catch (err) {
      onMessage(
        `게임 생성 오류: ${err instanceof Error ? err.message : "unknown"}`
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <div className="text-sm">
          <span className="mb-1 block text-slate-400">
            방 제목{" "}
            <span className="text-xs text-slate-500">
              (비우면 테마 이름 사용)
            </span>
          </span>
          <input
            value={gameTitle}
            onChange={(e) => setGameTitle(e.target.value)}
            maxLength={40}
            placeholder="예: 5학년 2반 미디어 퀴즈"
            className="w-full max-w-md rounded-lg bg-slate-800 px-3 py-2"
          />
        </div>
        <div className="text-sm">
          <span className="mb-2 block text-slate-400">테마</span>
          {themes.length === 0 ? (
            <p className="text-slate-500">등록된 문제가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => {
                const selected = gameTheme === t;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setGameTheme(t)}
                    className={`rounded-lg border-2 px-4 py-2 transition ${
                      selected
                        ? "border-fuchsia-500 bg-fuchsia-500/20 font-semibold text-fuchsia-200 shadow-[0_0_10px_rgba(217,70,239,0.35)]"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {t}
                    <span className="ml-1.5 text-xs opacity-70">
                      활성 {activeCount(t)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-400">
              문제 개수 (최대 {availableCount})
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={questionCount}
              onChange={(e) =>
                setQuestionCount(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="w-24 rounded-lg bg-slate-800 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-400">최대 인원</span>
            <input
              type="text"
              inputMode="numeric"
              value={maxPlayers}
              onChange={(e) =>
                setMaxPlayers(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="w-24 rounded-lg bg-slate-800 px-3 py-2"
            />
          </label>
          <button
            disabled={creating || themes.length === 0}
            className="rounded-lg bg-fuchsia-600 px-5 py-2 font-semibold transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "생성중…" : "생성"}
          </button>
        </div>
      </form>

      {/* Selected theme's active questions preview */}
      {gameTheme && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <p className="mb-2 text-sm text-slate-400">
            <span className="font-semibold text-fuchsia-300">{gameTheme}</span>{" "}
            테마 활성 문제 {themeActiveQuizzes.length}개
          </p>
          {themeActiveQuizzes.length === 0 ? (
            <p className="text-sm text-slate-500">
              이 테마에 활성화된 문제가 없습니다.
            </p>
          ) : (
            <div className="grid max-h-96 grid-cols-1 gap-3 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {themeActiveQuizzes.map((q, qi) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-3"
                >
                  <p className="mb-2 flex items-start gap-1.5 text-sm font-medium text-slate-100">
                    <span className="shrink-0 text-fuchsia-400">Q{qi + 1}.</span>
                    <span>{q.question}</span>
                  </p>
                  <ul className="space-y-1">
                    {q.options.map((opt, oi) => {
                      const correct = oi === q.correct_answer;
                      return (
                        <li
                          key={oi}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                            correct
                              ? "bg-green-500/15 font-semibold text-green-300"
                              : "text-slate-400"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                              correct
                                ? "bg-green-500 text-white"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {correct ? "✓" : oi + 1}
                          </span>
                          {opt}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            이 중 무작위 {questionCount || availableCount}문제가 게임에
            사용됩니다.
          </p>
        </div>
      )}
    </>
  );
}
