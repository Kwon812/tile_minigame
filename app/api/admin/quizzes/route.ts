import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/admin/quizzes?theme=science  -> list quizzes (optionally by theme)
export async function GET(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get("theme");

  let query = supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });

  if (theme) query = query.eq("theme", theme);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ quizzes: data });
}

// POST /api/admin/quizzes  -> create a quiz
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, options, correct_answer, theme, difficulty, is_active } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof question !== "string" ||
    !Array.isArray(options) ||
    options.length < 2 ||
    typeof correct_answer !== "number" ||
    correct_answer < 0 ||
    correct_answer >= options.length ||
    typeof theme !== "string"
  ) {
    return NextResponse.json(
      { error: "question, options(2+), correct_answer, theme are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      question,
      options,
      correct_answer,
      theme,
      difficulty: typeof difficulty === "string" ? difficulty : "normal",
      is_active: typeof is_active === "boolean" ? is_active : true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ quiz: data }, { status: 201 });
}
