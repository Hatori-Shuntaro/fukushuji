create extension if not exists pgcrypto;

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  question text not null check (char_length(trim(question)) > 0),
  choices jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) >= 2),
  correct_index integer not null check (correct_index >= 0 and correct_index < jsonb_array_length(choices)),
  is_favorite boolean not null default false,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists exams_user_id_idx on public.exams(user_id);
create index if not exists questions_user_id_idx on public.questions(user_id);
create index if not exists questions_exam_id_idx on public.questions(exam_id);
create index if not exists questions_favorite_idx on public.questions(user_id, is_favorite);
create index if not exists study_results_user_id_idx on public.study_results(user_id);
create index if not exists study_results_question_id_idx on public.study_results(question_id);

alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.study_results enable row level security;

drop policy if exists "Users can read own exams" on public.exams;
drop policy if exists "Users can insert own exams" on public.exams;
drop policy if exists "Users can update own exams" on public.exams;
drop policy if exists "Users can delete own exams" on public.exams;

create policy "Users can read own exams"
  on public.exams for select
  using (auth.uid() = user_id);

create policy "Users can insert own exams"
  on public.exams for insert
  with check (auth.uid() = user_id);

create policy "Users can update own exams"
  on public.exams for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own exams"
  on public.exams for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own questions" on public.questions;
drop policy if exists "Users can insert own questions" on public.questions;
drop policy if exists "Users can update own questions" on public.questions;
drop policy if exists "Users can delete own questions" on public.questions;

create policy "Users can read own questions"
  on public.questions for select
  using (auth.uid() = user_id);

create policy "Users can insert own questions"
  on public.questions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.exams
      where exams.id = exam_id
      and exams.user_id = auth.uid()
    )
  );

create policy "Users can update own questions"
  on public.questions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.exams
      where exams.id = exam_id
      and exams.user_id = auth.uid()
    )
  );

create policy "Users can delete own questions"
  on public.questions for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own study results" on public.study_results;
drop policy if exists "Users can insert own study results" on public.study_results;
drop policy if exists "Users can delete own study results" on public.study_results;

create policy "Users can read own study results"
  on public.study_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own study results"
  on public.study_results for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.questions
      where questions.id = question_id
      and questions.user_id = auth.uid()
    )
  );

create policy "Users can delete own study results"
  on public.study_results for delete
  using (auth.uid() = user_id);
