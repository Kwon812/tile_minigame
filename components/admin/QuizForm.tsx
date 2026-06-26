"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { QuizFormState } from "@/hooks/useAdminQuizzes";

/** "문제 추가" section — new quiz form with click-to-pick correct answer. */
export function QuizForm({
  form,
  setForm,
  themes,
  useCustomTheme,
  setUseCustomTheme,
  onSubmit,
}: {
  form: QuizFormState;
  setForm: Dispatch<SetStateAction<QuizFormState>>;
  themes: string[];
  useCustomTheme: boolean;
  setUseCustomTheme: Dispatch<SetStateAction<boolean>>;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <section className="rounded-2xl bg-slate-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">문제 추가</h2>
      <form onSubmit={onSubmit} className="space-y-3">
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
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
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
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
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
  );
}
