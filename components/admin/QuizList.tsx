"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Quiz } from "@/lib/types";

/** "문제 목록" section — filterable list with toggle/edit/delete actions. */
export function QuizList({
  quizzes,
  filteredQuizzes,
  themes,
  loading,
  listFilter,
  setListFilter,
  onToggle,
  onEdit,
  onDelete,
}: {
  quizzes: Quiz[];
  filteredQuizzes: Quiz[];
  themes: string[];
  loading: boolean;
  listFilter: string;
  setListFilter: Dispatch<SetStateAction<string>>;
  onToggle: (q: Quiz) => void;
  onEdit: (q: Quiz) => void;
  onDelete: (id: string) => void;
}) {
  return (
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
                        i === q.correct_answer ? "mr-2 text-green-400" : "mr-2"
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
                  onClick={() => onToggle(q)}
                  className={`rounded px-2 py-1 text-xs ${
                    q.is_active ? "bg-green-700" : "bg-slate-600 text-slate-300"
                  }`}
                >
                  {q.is_active ? "활성" : "비활성"}
                </button>
                <button
                  onClick={() => onEdit(q)}
                  className="rounded px-2 py-1 text-xs text-sky-300 hover:bg-sky-900/40"
                >
                  수정
                </button>
                <button
                  onClick={() => onDelete(q.id)}
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
  );
}
