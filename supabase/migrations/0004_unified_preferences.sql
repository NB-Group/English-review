create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "preferences are private" on public.user_preferences;
create policy "preferences are private" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
