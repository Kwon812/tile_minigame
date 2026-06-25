// Game-room creation logic. Lives on the socket server (Render) because the
// room is held in that process's memory — the Vercel app proxies to it.

import { supabase } from "../lib/supabase";
import type { Quiz } from "../lib/types";
import { store, type RoomRuntime } from "./store";

export class CreateGameError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface CreateGameInput {
  title?: string;
  theme: string;
  questionCount?: number;
  maxPlayers?: number;
}

export async function createGameRoom(
  input: CreateGameInput
): Promise<RoomRuntime> {
  const theme = input.theme;
  const questionCount = input.questionCount ?? 10;
  const maxPlayers = input.maxPlayers ?? 30;

  if (!theme) throw new CreateGameError("theme is required", 400);

  // Load active quizzes for the theme from Supabase (persistent quiz data).
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("theme", theme)
    .eq("is_active", true);

  if (error) throw new CreateGameError(error.message, 500);

  const quizzes = (data ?? []) as Quiz[];
  if (quizzes.length === 0) {
    throw new CreateGameError(`테마 '${theme}'에 활성화된 문제가 없습니다.`, 400);
  }

  // Shuffle and take up to questionCount.
  const shuffled = [...quizzes].sort(() => Math.random() - 0.5);
  const questionList = shuffled.slice(0, Math.max(1, questionCount));

  return store.createRoom({ title: input.title, theme, maxPlayers, questionList });
}
