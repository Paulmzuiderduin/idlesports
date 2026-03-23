create table if not exists public.idle_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.idle_saves enable row level security;

create policy "Idle saves are user scoped" on public.idle_saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.leaderboard_entries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  titles integer not null default 0,
  wins integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_entries enable row level security;

create policy "Leaderboard is readable" on public.leaderboard_entries
  for select
  using (true);

create policy "Leaderboard writes are user scoped" on public.leaderboard_entries
  for insert
  with check (auth.uid() = user_id);

create policy "Leaderboard updates are user scoped" on public.leaderboard_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
