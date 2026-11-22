create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
grant select, insert, update on public.user_preferences to authenticated;

do $migration$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_preferences'
      and policyname = 'preferences are private'
  ) then
    create policy "preferences are private" on public.user_preferences
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$migration$;
