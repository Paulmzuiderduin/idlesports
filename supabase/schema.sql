create table if not exists public.idle_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.idle_saves enable row level security;

drop policy if exists "Idle saves are user scoped" on public.idle_saves;
create policy "Idle saves are user scoped" on public.idle_saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.leaderboard_entries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  titles integer not null default 0,
  wins integer not null default 0,
  best_titles integer not null default 0,
  best_wins integer not null default 0,
  rebirths integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_entries
  add column if not exists best_titles integer not null default 0,
  add column if not exists best_wins integer not null default 0,
  add column if not exists rebirths integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leaderboard_entries_non_negative'
  ) then
    alter table public.leaderboard_entries
      add constraint leaderboard_entries_non_negative
      check (titles >= 0 and wins >= 0 and best_titles >= 0 and best_wins >= 0 and rebirths >= 0);
  end if;
end
$$;

alter table public.leaderboard_entries enable row level security;

drop policy if exists "Leaderboard is readable" on public.leaderboard_entries;
create policy "Leaderboard is readable" on public.leaderboard_entries
  for select
  using (true);

drop policy if exists "Leaderboard writes are user scoped" on public.leaderboard_entries;
create policy "Leaderboard writes are user scoped" on public.leaderboard_entries
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Leaderboard updates are user scoped" on public.leaderboard_entries;
create policy "Leaderboard updates are user scoped" on public.leaderboard_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
