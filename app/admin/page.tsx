"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Quiz } from "@/lib/types";

const EMPTY_FORM = {
  question: "",
  options: ["", "", "", ""],
  correct_answer: 0,
  theme: "딥페이크",
  difficulty: "normal",
};

export default function AdminPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [msg, setMsg] = useState<string | null>(null);

  // quiz list theme filter ("all" = 전체)
  const [listFilter, setListFilter] = useState<string>("all");

  // 문제 추가 테마 입력 모드: 기존 테마 선택 vs 새 테마 직접 입력
  const [useCustomTheme, setUseCustomTheme] = useState(false);

  // 문제 수정 모달
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    question: string;
    options: string[];
    correct_answer: number;
    theme: string;
    difficulty: string;
    is_active: boolean;
  } | null>(null);

  // game creation (string-backed so the fields can be cleared/retyped freely)
  const [gameTitle, setGameTitle] = useState("");
  const [gameTheme, setGameTheme] = useState("딥페이크");
  const [questionCount, setQuestionCount] = useState("10");
  const [maxPlayers, setMaxPlayers] = useState("30");
  // 소켓 서버의 실제 활성 방 목록 (새로고침해도 유지됨).
  const [rooms, setRooms] = useState<
    {
      roomId: string;
      title: string;
      theme: string;
      gameState: string;
      players: number;
      maxPlayers: number;
      questionCount: number;
      round: number;
    }[]
  >([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/quizzes");
    const data = await res.json();
    setQuizzes(data.quizzes ?? []);
    setLoading(false);
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      /* 소켓 서버 미동작 시 무시 */
    }
  }, []);

  useEffect(() => {
    load();
    loadRooms();
  }, [load, loadRooms]);

  // Distinct themes that actually have quizzes — used to populate the dropdown.
  const themes = Array.from(new Set(quizzes.map((q) => q.theme))).sort();

  // Active quizzes available for the selected theme (what a game can actually use).
  const activeCount = (theme: string) =>
    quizzes.filter((q) => q.theme === theme && q.is_active).length;
  const availableCount = activeCount(gameTheme);

  // Active quizzes for the theme chosen in game creation (preview list).
  const themeActiveQuizzes = quizzes.filter(
    (q) => q.theme === gameTheme && q.is_active
  );

  // Quizzes shown in the list, filtered by the selected category.
  const filteredQuizzes =
    listFilter === "all"
      ? quizzes
      : quizzes.filter((q) => q.theme === listFilter);

  // Keep the selected game theme valid, and sync the question count to the
  // number of active questions that theme has (the achievable maximum).
  useEffect(() => {
    if (themes.length > 0 && !themes.includes(gameTheme)) {
      setGameTheme(themes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes]);

  useEffect(() => {
    setQuestionCount(String(availableCount > 0 ? availableCount : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTheme, availableCount]);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        options: form.options.map((o) => o.trim()).filter(Boolean),
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMsg(`오류: ${d.error}`);
      return;
    }
    // 방금 추가한 테마를 유지한 채 나머지 필드만 초기화.
    const keepTheme = form.theme;
    setForm({ ...EMPTY_FORM, theme: keepTheme, options: ["", "", "", ""] });
    setUseCustomTheme(false);
    setMsg("문제가 추가되었습니다.");
    load();
  }

  async function deleteQuiz(id: string) {
    if (!confirm("이 문제를 삭제할까요?")) return;
    await fetch(`/api/admin/quizzes/${id}`, { method: "DELETE" });
    load();
  }

  async function toggleActive(q: Quiz) {
    await fetch(`/api/admin/quizzes/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !q.is_active }),
    });
    load();
  }

  function startEdit(q: Quiz) {
    setEditingId(q.id);
    setEditForm({
      question: q.question,
      options: [...q.options],
      correct_answer: q.correct_answer,
      theme: q.theme,
      difficulty: q.difficulty,
      is_active: q.is_active,
    });
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    const options = editForm.options.map((o) => o.trim()).filter(Boolean);
    if (!editForm.question.trim() || options.length < 2) {
      setMsg("오류: 문제 내용과 보기(2개 이상)를 입력하세요.");
      return;
    }
    const res = await fetch(`/api/admin/quizzes/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        options,
        correct_answer: Math.min(editForm.correct_answer, options.length - 1),
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMsg(`수정 오류: ${d.error}`);
      return;
    }
    closeEdit();
    setMsg("문제가 수정되었습니다.");
    load();
  }

  async function createGame(e: React.FormEvent) {
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
      const res = await fetch("/api/admin/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: gameTitle.trim() || gameTheme,
          theme: gameTheme,
          questionCount: qc,
          maxPlayers: mp,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(`게임 생성 오류: ${d.error}`);
        return;
      }
      setMsg(`"${d.title}" 방 생성됨 (${d.roomId})`);
      setGameTitle("");
      // 서버 기준 실제 방 목록을 다시 불러온다(새로고침해도 유지됨).
      loadRooms();
    } catch (err) {
      setMsg(
        `게임 생성 오류: ${err instanceof Error ? err.message : "unknown"}`
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">관리자 · Quiz Survival Arena</h1>
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            ← 홈
          </Link>
        </header>

        {msg && (
          <div className="rounded-lg bg-slate-800 px-4 py-2 text-sm">{msg}</div>
        )}

        {/* Game creation */}
        <section className="rounded-2xl bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">게임 생성</h2>
          <form onSubmit={createGame} className="space-y-4">
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
                        <span className="shrink-0 text-fuchsia-400">
                          Q{qi + 1}.
                        </span>
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

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                활성 방 ({rooms.length}) — 여러 방을 동시에 운영할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={loadRooms}
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
                    </div>
                    <span className="text-xs text-slate-400">
                      <span className="font-mono text-sky-300">{r.roomId}</span>{" "}
                      · {r.theme} · {r.questionCount}문제 · 인원 {r.players}/
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
                        setMsg(`방 ${r.roomId} 링크를 복사했습니다.`);
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
        </section>

        {/* Create quiz */}
        <section className="rounded-2xl bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">문제 추가</h2>
          <form onSubmit={createQuiz} className="space-y-3">
            <input
              required
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="문제 내용"
              className="w-full rounded-lg bg-slate-800 px-3 py-2"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {form.options.map((opt, i) => {
                const isCorrect = form.correct_answer === i;
                return (
                  <div
                    key={i}
                    onClick={() => setForm({ ...form, correct_answer: i })}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition ${
                      isCorrect
                        ? "border-green-500 bg-green-500/15 shadow-[0_0_10px_rgba(34,197,94,0.35)]"
                        : "border-slate-700 bg-slate-800 hover:border-slate-500"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isCorrect
                          ? "bg-green-500 text-white"
                          : "bg-slate-600 text-slate-200"
                      }`}
                    >
                      {isCorrect ? "✓" : i + 1}
                    </span>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const options = [...form.options];
                        options[i] = e.target.value;
                        setForm({ ...form, options });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={`보기 ${i + 1}`}
                      className="flex-1 bg-transparent outline-none"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              정답인 보기를 클릭하면 초록색으로 표시됩니다. (텍스트 입력란 클릭은
              선택에 영향을 주지 않습니다)
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="text-sm">
                <span className="mb-1 block text-slate-400">테마</span>
                {themes.length > 0 && !useCustomTheme ? (
                  <select
                    value={form.theme}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setUseCustomTheme(true);
                        setForm({ ...form, theme: "" });
                      } else {
                        setForm({ ...form, theme: e.target.value });
                      }
                    }}
                    className="rounded-lg bg-slate-800 px-3 py-2"
                  >
                    {/* 선택된 테마가 목록에 없을 수도 있으니 보정 */}
                    {!themes.includes(form.theme) && form.theme && (
                      <option value={form.theme}>{form.theme}</option>
                    )}
                    {themes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="__custom__">+ 새 테마 입력…</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus={useCustomTheme}
                      value={form.theme}
                      onChange={(e) =>
                        setForm({ ...form, theme: e.target.value })
                      }
                      placeholder="새 테마명"
                      className="rounded-lg bg-slate-800 px-3 py-2"
                    />
                    {themes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomTheme(false);
                          setForm({ ...form, theme: themes[0] });
                        }}
                        className="text-xs text-slate-400 underline hover:text-white"
                      >
                        기존 선택
                      </button>
                    )}
                  </div>
                )}
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-400">난이도</span>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm({ ...form, difficulty: e.target.value })
                  }
                  className="rounded-lg bg-slate-800 px-3 py-2"
                >
                  <option value="easy">easy</option>
                  <option value="normal">normal</option>
                  <option value="hard">hard</option>
                </select>
              </label>
            </div>
            <button className="rounded-lg bg-sky-600 px-5 py-2 font-semibold transition hover:bg-sky-500">
              문제 추가
            </button>
          </form>
        </section>

        {/* Quiz list */}
        <section className="rounded-2xl bg-slate-900 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              문제 목록 ({filteredQuizzes.length}
              {listFilter !== "all" && ` / 전체 ${quizzes.length}`})
            </h2>
            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setListFilter("all")}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  listFilter === "all"
                    ? "bg-sky-600 font-semibold"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                전체 ({quizzes.length})
              </button>
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setListFilter(t)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    listFilter === t
                      ? "bg-sky-600 font-semibold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {t} ({quizzes.filter((q) => q.theme === t).length})
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <p className="text-slate-400">불러오는 중…</p>
          ) : (
            <div className="space-y-2">
              {filteredQuizzes.map((q) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-4 rounded-lg bg-slate-800 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{q.question}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {q.options.map((o, i) => (
                        <span
                          key={i}
                          className={
                            i === q.correct_answer
                              ? "mr-2 text-green-400"
                              : "mr-2"
                          }
                        >
                          {i + 1}.{o}
                        </span>
                      ))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {q.theme} · {q.difficulty}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      onClick={() => toggleActive(q)}
                      className={`rounded px-2 py-1 text-xs ${
                        q.is_active
                          ? "bg-green-700"
                          : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      {q.is_active ? "활성" : "비활성"}
                    </button>
                    <button
                      onClick={() => startEdit(q)}
                      className="rounded px-2 py-1 text-xs text-sky-300 hover:bg-sky-900/40"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteQuiz(q.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/40"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {filteredQuizzes.length === 0 && (
                <p className="text-slate-500">
                  {listFilter === "all"
                    ? "등록된 문제가 없습니다."
                    : `'${listFilter}' 테마에 문제가 없습니다.`}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* 문제 수정 모달 */}
      {editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur"
          onClick={closeEdit}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-slate-900 p-6 text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold">문제 수정</h3>

            <div className="space-y-3">
              <input
                value={editForm.question}
                onChange={(e) =>
                  setEditForm({ ...editForm, question: e.target.value })
                }
                placeholder="문제 내용"
                className="w-full rounded-lg bg-slate-800 px-3 py-2"
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {editForm.options.map((opt, i) => {
                  const isCorrect = editForm.correct_answer === i;
                  return (
                    <div
                      key={i}
                      onClick={() =>
                        setEditForm({ ...editForm, correct_answer: i })
                      }
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition ${
                        isCorrect
                          ? "border-green-500 bg-green-500/15"
                          : "border-slate-700 bg-slate-800 hover:border-slate-500"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isCorrect
                            ? "bg-green-500 text-white"
                            : "bg-slate-600 text-slate-200"
                        }`}
                      >
                        {isCorrect ? "✓" : i + 1}
                      </span>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const options = [...editForm.options];
                          options[i] = e.target.value;
                          setEditForm({ ...editForm, options });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={`보기 ${i + 1}`}
                        className="w-full flex-1 bg-transparent outline-none"
                      />
                      {editForm.options.length > 2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const options = editForm.options.filter(
                              (_, oi) => oi !== i
                            );
                            let correct = editForm.correct_answer;
                            if (i === correct) correct = 0;
                            else if (i < correct) correct -= 1;
                            setEditForm({
                              ...editForm,
                              options,
                              correct_answer: correct,
                            });
                          }}
                          className="shrink-0 text-slate-400 hover:text-red-400"
                          aria-label="보기 삭제"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {editForm.options.length < 6 && (
                <button
                  type="button"
                  onClick={() =>
                    setEditForm({
                      ...editForm,
                      options: [...editForm.options, ""],
                    })
                  }
                  className="text-xs text-sky-300 hover:underline"
                >
                  + 보기 추가
                </button>
              )}
              <p className="text-xs text-slate-500">
                정답인 보기를 클릭하세요 (초록색).
              </p>

              <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-400">테마</span>
                  <input
                    value={editForm.theme}
                    onChange={(e) =>
                      setEditForm({ ...editForm, theme: e.target.value })
                    }
                    list="edit-theme-list"
                    className="rounded-lg bg-slate-800 px-3 py-2"
                  />
                  <datalist id="edit-theme-list">
                    {themes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-400">난이도</span>
                  <select
                    value={editForm.difficulty}
                    onChange={(e) =>
                      setEditForm({ ...editForm, difficulty: e.target.value })
                    }
                    className="rounded-lg bg-slate-800 px-3 py-2"
                  >
                    <option value="easy">easy</option>
                    <option value="normal">normal</option>
                    <option value="hard">hard</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_active: e.target.checked })
                    }
                  />
                  활성화
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeEdit}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm transition hover:bg-slate-600"
              >
                취소
              </button>
              <button
                onClick={saveEdit}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold transition hover:bg-sky-500"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
