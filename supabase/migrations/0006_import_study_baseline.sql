create or replace function public.import_study_baseline(
  target_user uuid,
  source_preferences jsonb,
  source_states jsonb,
  verify_only boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected integer;
  missing integer;
begin
  if jsonb_typeof(source_preferences) is distinct from 'object'
     or jsonb_typeof(source_states) is distinct from 'array' then
    raise exception 'Invalid migration snapshot';
  end if;

  if not exists (select 1 from auth.users where id = target_user) then
    raise exception 'Supabase account does not exist';
  end if;

  expected := jsonb_array_length(source_states);
  if expected <> (select count(distinct item->>'cardId') from jsonb_array_elements(source_states) as input(item)) then
    raise exception 'Snapshot contains duplicate or missing card IDs';
  end if;
  if exists (
    select 1 from jsonb_array_elements(source_states) as input(item)
    where nullif(item->>'cardId', '') is null
      or item->>'status' is null
      or item->>'dueAt' is null
      or item->>'intervalDays' is null
      or item->>'lapseCount' is null
      or item->>'updatedAt' is null
  ) then
    raise exception 'Snapshot contains incomplete learning states';
  end if;
  if exists (
    select 1 from jsonb_array_elements(source_states) as input(item)
    where (item->>'status')::public.learning_status not in ('new', 'learning', 'review', 'mastered')
      or (item->>'intervalDays')::integer < 0
      or (item->>'lapseCount')::integer < 0
      or not isfinite((item->>'dueAt')::timestamptz)
      or not isfinite((item->>'updatedAt')::timestamptz)
      or item->>'lastGrade' not in ('again', 'hard', 'good', 'easy')
  ) then
    raise exception 'Snapshot contains invalid learning states';
  end if;

  if exists (
    select 1 from public.user_preferences
    where user_id = target_user and preferences is distinct from source_preferences
  ) then
    raise exception 'Existing preferences differ from the snapshot';
  end if;

  if not verify_only then
    insert into public.user_preferences (user_id, preferences)
    values (target_user, source_preferences)
    on conflict (user_id) do nothing;

    insert into public.learning_states (
      user_id, card_id, status, due_at, interval_days, lapse_count, updated_at, last_grade, scheduler_state
    )
    select target_user, item->>'cardId', (item->>'status')::public.learning_status,
      (item->>'dueAt')::timestamptz, (item->>'intervalDays')::integer,
      (item->>'lapseCount')::integer, (item->>'updatedAt')::timestamptz,
      (item->>'lastGrade')::public.review_grade, item->'schedulerState'
    from jsonb_array_elements(source_states) as input(item)
    on conflict (user_id, card_id) do nothing;

    if not exists (
      select 1 from public.user_preferences where user_id = target_user and preferences = source_preferences
    ) then
      raise exception 'Preferences changed during import';
    end if;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(source_states) as input(item)
    join public.learning_states as state
      on state.user_id = target_user and state.card_id = item->>'cardId'
    where state.status is distinct from (item->>'status')::public.learning_status
      or state.due_at is distinct from (item->>'dueAt')::timestamptz
      or state.interval_days is distinct from (item->>'intervalDays')::integer
      or state.lapse_count is distinct from (item->>'lapseCount')::integer
      or state.updated_at is distinct from (item->>'updatedAt')::timestamptz
      or state.last_grade is distinct from (item->>'lastGrade')::public.review_grade
      or state.scheduler_state is distinct from item->'schedulerState'
  ) then
    raise exception 'Existing learning states differ from the snapshot';
  end if;

  select count(*) into missing
  from jsonb_array_elements(source_states) as input(item)
  where not exists (
    select 1 from public.learning_states
    where user_id = target_user and card_id = item->>'cardId'
  );

  if not verify_only and missing <> 0 then
    raise exception 'Import verification did not match the snapshot';
  end if;

  return jsonb_build_object('expected', expected, 'matched', expected - missing, 'missing', missing);
end;
$$;

revoke execute on function public.import_study_baseline(uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.import_study_baseline(uuid, jsonb, jsonb, boolean) to service_role;
