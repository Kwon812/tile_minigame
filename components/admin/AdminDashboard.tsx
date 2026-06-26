"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminQuizzes } from "@/hooks/useAdminQuizzes";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { GameCreateForm } from "./GameCreateForm";
import { RoomList } from "./RoomList";
import { QuizForm } from "./QuizForm";
import { QuizList } from "./QuizList";
import { QuizEditModal } from "./QuizEditModal";

/** Admin console: game creation, live rooms, and quiz CRUD. */
export default function AdminDashboard() {
  const [msg, setMsg] = useState<string | null>(null);
  const quiz = useAdminQuizzes(setMsg);
  const { rooms, reload: reloadRooms } = useAdminRooms();

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
          <GameCreateForm
            quizzes={quiz.quizzes}
            themes={quiz.themes}
            activeCount={quiz.activeCount}
            onMessage={setMsg}
            onCreated={reloadRooms}
          />
          <RoomList rooms={rooms} onReload={reloadRooms} onMessage={setMsg} />
        </section>

        <QuizForm
          form={quiz.form}
          setForm={quiz.setForm}
          themes={quiz.themes}
          useCustomTheme={quiz.useCustomTheme}
          setUseCustomTheme={quiz.setUseCustomTheme}
          onSubmit={quiz.submitCreate}
        />

        <QuizList
          quizzes={quiz.quizzes}
          filteredQuizzes={quiz.filteredQuizzes}
          themes={quiz.themes}
          loading={quiz.loading}
          listFilter={quiz.listFilter}
          setListFilter={quiz.setListFilter}
          onToggle={quiz.toggleActive}
          onEdit={quiz.startEdit}
          onDelete={quiz.remove}
        />
      </div>

      <QuizEditModal
        editForm={quiz.editForm}
        setEditForm={quiz.setEditForm}
        themes={quiz.themes}
        onClose={quiz.closeEdit}
        onSave={quiz.saveEdit}
      />
    </div>
  );
}
