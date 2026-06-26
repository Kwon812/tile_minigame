// Quiz CRUD service — thin wrappers around the /api/admin/quizzes endpoints.
// Centralizes fetch + payload sanitization so components/hooks stay UI-only.
import type { Quiz } from "@/lib/types";

export interface QuizInput {
  question: string;
  options: string[];
  correct_answer: number;
  theme: string;
  difficulty: string;
  is_active?: boolean;
}

/** Drop blank options and trim whitespace. */
export const sanitizeOptions = (options: string[]) =>
  options.map((o) => o.trim()).filter(Boolean);

export async function listQuizzes(): Promise<Quiz[]> {
  const res = await fetch("/api/admin/quizzes");
  const data = await res.json();
  return data.quizzes ?? [];
}

/** Throws Error(message) on failure so callers can surface `err.message`. */
export async function createQuiz(input: QuizInput): Promise<void> {
  const res = await fetch("/api/admin/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, options: sanitizeOptions(input.options) }),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error ?? "문제 추가 실패");
  }
}

export async function updateQuiz(
  id: string,
  patch: Partial<QuizInput>
): Promise<void> {
  const res = await fetch(`/api/admin/quizzes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error ?? "문제 수정 실패");
  }
}

export async function deleteQuiz(id: string): Promise<void> {
  await fetch(`/api/admin/quizzes/${id}`, { method: "DELETE" });
}

/** Flip a quiz's active flag. */
export async function toggleQuizActive(q: Quiz): Promise<void> {
  await updateQuiz(q.id, { is_active: !q.is_active });
}
