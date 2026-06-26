"use client";

import type { Dispatch, SetStateAction } from "react";
import type { EditForm } from "@/hooks/useAdminQuizzes";

/** Quiz edit modal. Renders nothing when `editForm` is null. */
export function QuizEditModal({
  editForm,
  setEditForm,
  themes,
  onClose,
  onSave,
}: {
  editForm: EditForm | null;
  setEditForm: Dispatch<SetStateAction<EditForm | null>>;
  themes: string[];
  onClose: () => void;
  onSave: () => void;
}) {
  if (!editForm) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur"
      onClick={onClose}
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
                  onClick={() => setEditForm({ ...editForm, correct_answer: i })}
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
                setEditForm({ ...editForm, options: [...editForm.options, ""] })
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
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm transition hover:bg-slate-600"
          >
            취소
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold transition hover:bg-sky-500"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
