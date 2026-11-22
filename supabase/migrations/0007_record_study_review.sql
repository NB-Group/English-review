create table if not exists public.study_review_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  card_id text not null,
  grade public.review_grade,
  reviewed_at timestamptz not null,
  content_version text not null,
  state jsonb not null,
  primary key (user_id, event_id)
);

alter table public.study_review_events enable row level security;
grant select on public.study_review_events to authenticated;
create policy "study review events are private" on public.study_review_events
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.record_study_review(
  expected_user uuid,
  event_id uuid,
  content_version text,
  grade public.review_grade,
  review_state jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  card_key text := review_state->>'cardId';
  reviewed_at timestamptz := (review_state->>'updatedAt')::timestamptz;
begin
  if owner_id is null or owner_id is distinct from expected_user then
    raise exception 'Account changed before the review could sync';
  end if;
  if card_key is null or not starts_with(card_key, 'card:' || content_version || ':')
     or reviewed_at is null or not isfinite(reviewed_at) then
    raise exception 'Invalid review state';
  end if;

  insert into public.study_review_events (
    user_id, event_id, card_id, grade, reviewed_at, content_version, state
  ) values (owner_id, event_id, card_key, grade, reviewed_at, content_version, review_state)
  on conflict on constraint study_review_events_pkey do nothing;
  if not found then return; end if;

  insert into public.learning_states as current_state (
    user_id, card_id, status, due_at, interval_days, lapse_count, updated_at, last_grade, scheduler_state
  ) values (
    owner_id, card_key, (review_state->>'status')::public.learning_status,
    (review_state->>'dueAt')::timestamptz, (review_state->>'intervalDays')::integer,
    (review_state->>'lapseCount')::integer, reviewed_at, grade, review_state->'schedulerState'
  ) on conflict (user_id, card_id) do update set
    status = excluded.status,
    due_at = excluded.due_at,
    interval_days = excluded.interval_days,
    lapse_count = excluded.lapse_count,
    updated_at = excluded.updated_at,
    last_grade = excluded.last_grade,
    scheduler_state = excluded.scheduler_state
    where current_state.updated_at <= excluded.updated_at;
end;
$$;

revoke execute on function public.record_study_review(uuid, uuid, text, public.review_grade, jsonb) from public, anon;
grant execute on function public.record_study_review(uuid, uuid, text, public.review_grade, jsonb) to authenticated;
