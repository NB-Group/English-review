create table public.study_vocabulary_ai_quota (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hour_start timestamptz not null,
  request_count integer not null
);

alter table public.study_vocabulary_ai_quota enable row level security;
revoke all on public.study_vocabulary_ai_quota from public, anon, authenticated;

create function public.take_study_vocabulary_ai_request(request_user uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with accepted as (
    insert into public.study_vocabulary_ai_quota as quota(user_id, hour_start, request_count)
    values (request_user, date_trunc('hour', now()), 1)
    on conflict (user_id) do update set
      hour_start = excluded.hour_start,
      request_count = case when quota.hour_start = excluded.hour_start then quota.request_count + 1 else 1 end
    where quota.hour_start < excluded.hour_start or quota.request_count < 120
    returning 1
  )
  select exists (select 1 from accepted);
$$;

revoke execute on function public.take_study_vocabulary_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.take_study_vocabulary_ai_request(uuid) to service_role;
