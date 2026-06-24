-- Quiz Survival Arena — database schema
-- The database is used ONLY for quiz management. All real-time game state
-- (rooms, players, positions) lives in the Socket.IO server's memory.
--
-- Run this in the Supabase SQL editor for project `cndfqfdqyogsqocuauyl`.

create extension if not exists "pgcrypto";

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  correct_answer integer not null,
  theme varchar(50) not null,
  difficulty varchar(20) not null default 'normal',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists quizzes_theme_idx on public.quizzes (theme);
create index if not exists quizzes_active_idx on public.quizzes (is_active);

-- This portfolio project talks to Supabase with the anon key only, so we enable
-- RLS and add permissive policies. Tighten these (or move admin writes behind a
-- service-role key) before any real deployment.
alter table public.quizzes enable row level security;

drop policy if exists "quizzes_read" on public.quizzes;
create policy "quizzes_read" on public.quizzes
  for select using (true);

drop policy if exists "quizzes_write" on public.quizzes;
create policy "quizzes_write" on public.quizzes
  for all using (true) with check (true);

-- Sample data so a game can be created immediately.
insert into public.quizzes (question, options, correct_answer, theme, difficulty)
values
  ('대한민국의 수도는?', '["서울","부산","대전","광주"]', 0, 'geography', 'easy'),
  ('지구에서 가장 큰 대양은?', '["대서양","인도양","태평양","북극해"]', 2, 'geography', 'easy'),
  ('물의 화학식은?', '["CO2","H2O","O2","NaCl"]', 1, 'science', 'easy'),
  ('빛의 속도에 가장 가까운 값은?', '["300 km/s","3,000 km/s","30만 km/s","3만 km/s"]', 2, 'science', 'normal'),
  ('태양계에서 가장 큰 행성은?', '["지구","목성","토성","화성"]', 1, 'science', 'easy'),
  ('1 + 1 × 2 의 값은?', '["3","4","2","6"]', 0, 'math', 'easy'),
  ('삼각형 내각의 합은?', '["90도","180도","270도","360도"]', 1, 'math', 'easy'),
  ('한글을 창제한 왕은?', '["태조","세종대왕","정조","광개토대왕"]', 1, 'history', 'easy'),
  ('첫 번째 월드컵이 열린 해는?', '["1930","1950","1966","1900"]', 0, 'history', 'normal'),
  ('가장 작은 소수(prime)는?', '["0","1","2","3"]', 2, 'math', 'normal')
on conflict do nothing;
