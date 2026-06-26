"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Quiz } from "@/lib/types";
import {
  createQuiz,
  deleteQuiz,
  listQuizzes,
  sanitizeOptions,
  toggleQuizActive,
  updateQuiz,
} from "@/services/quizService";

export interface QuizFormState {
  question: string;
  options: string[];
  correct_answer: number;
  theme: string;
  difficulty: string;
}

const EMPTY_FORM: QuizFormState = {
  question: "",
  options: ["", "", "", ""],
  correct_answer: 0,
  theme: "딥페이크",
  difficulty: "normal",
};

export interface EditForm {
  question: string;
  options: string[];
  correct_answer: number;
  theme: string;
  difficulty: string;
  is_active: boolean;
}

/**
 * Owns all quiz-management state (list, create form, edit modal, filter) and
 * the service calls behind them. `onMessage` surfaces status text in the UI.
 */
export function useAdminQuizzes(onMessage: (m: string) => void) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<QuizFormState>({ ...EMPTY_FORM });
  const [listFilter, setListFilter] = useState<string>("all");
  const [useCustomTheme, setUseCustomTheme] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setQuizzes(await listQuizzes());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Distinct themes that actually have quizzes — used to populate dropdowns.
  const themes = useMemo(
    () => Array.from(new Set(quizzes.map((q) => q.theme))).sort(),
    [quizzes]
  );
  // Active quizzes available for a theme (what a game can actually use).
  const activeCount = useCallback(
    (theme: string) =>
      quizzes.filter((q) => q.theme === theme && q.is_active).length,
    [quizzes]
  );
  const filteredQuizzes = useMemo(
    () =>
      listFilter === "all"
        ? quizzes
        : quizzes.filter((q) => q.theme === listFilter),
    [quizzes, listFilter]
  );

  const submitCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createQuiz(form);
      } catch (err) {
        onMessage(`오류: ${err instanceof Error ? err.message : "unknown"}`);
        return;
      }
      // 방금 추가한 테마를 유지한 채 나머지 필드만 초기화.
      setForm({ ...EMPTY_FORM, theme: form.theme, options: ["", "", "", ""] });
      setUseCustomTheme(false);
      onMessage("문제가 추가되었습니다.");
      reload();
    },
    [form, onMessage, reload]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("이 문제를 삭제할까요?")) return;
      await deleteQuiz(id);
      reload();
    },
    [reload]
  );

  const toggleActive = useCallback(
    async (q: Quiz) => {
      await toggleQuizActive(q);
      reload();
    },
    [reload]
  );

  const startEdit = useCallback((q: Quiz) => {
    setEditingId(q.id);
    setEditForm({
      question: q.question,
      options: [...q.options],
      correct_answer: q.correct_answer,
      theme: q.theme,
      difficulty: q.difficulty,
      is_active: q.is_active,
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditingId(null);
    setEditForm(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || !editForm) return;
    const options = sanitizeOptions(editForm.options);
    if (!editForm.question.trim() || options.length < 2) {
      onMessage("오류: 문제 내용과 보기(2개 이상)를 입력하세요.");
      return;
    }
    try {
      await updateQuiz(editingId, {
        ...editForm,
        options,
        correct_answer: Math.min(editForm.correct_answer, options.length - 1),
      });
    } catch (err) {
      onMessage(`수정 오류: ${err instanceof Error ? err.message : "unknown"}`);
      return;
    }
    closeEdit();
    onMessage("문제가 수정되었습니다.");
    reload();
  }, [editingId, editForm, onMessage, closeEdit, reload]);

  return {
    quizzes,
    loading,
    themes,
    activeCount,
    filteredQuizzes,
    form,
    setForm,
    useCustomTheme,
    setUseCustomTheme,
    submitCreate,
    listFilter,
    setListFilter,
    editForm,
    setEditForm,
    startEdit,
    closeEdit,
    saveEdit,
    remove,
    toggleActive,
  };
}
