create table public.study_legacy_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_username text not null check (legacy_username ~ '^[A-Za-z0-9_-]{3,32}$'),
  attempt_count integer not null default 0,
  attempt_window timestamptz not null default now(),
  claim_id uuid,
  claim_until timestamptz
);

create unique index study_legacy_accounts_username on public.study_legacy_accounts (lower(legacy_username));
alter table public.study_legacy_accounts enable row level security;
revoke all on public.study_legacy_accounts from public, anon, authenticated;

create function public.reserve_study_legacy_claim(request_username text, request_id uuid)
returns table (user_id uuid, legacy_username text)
language sql
security definer
set search_path = ''
as $$
  update public.study_legacy_accounts as legacy
  set claim_id = request_id,
      claim_until = now() + interval '10 minutes',
      attempt_count = case when legacy.attempt_window <= now() - interval '1 hour'
        then 1 else legacy.attempt_count + 1 end,
      attempt_window = case when legacy.attempt_window <= now() - interval '1 hour'
        then now() else legacy.attempt_window end
  from auth.users as account
  where lower(legacy.legacy_username) = lower(request_username)
    and account.id = legacy.user_id
    and account.raw_app_meta_data->'study_legacy_pending' = 'true'::jsonb
    and (legacy.claim_until is null or legacy.claim_until <= now())
    and (legacy.attempt_count < 5 or legacy.attempt_window <= now() - interval '1 hour')
  returning legacy.user_id, legacy.legacy_username;
$$;

create function public.release_study_legacy_claim(target_user uuid, request_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.study_legacy_accounts
  set claim_id = null, claim_until = null
  where user_id = target_user and claim_id = request_id;
$$;

create function public.refresh_study_legacy_baseline(
  target_user uuid, request_id uuid, source_preferences jsonb, source_states jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.study_legacy_accounts as legacy
  join auth.users as account on account.id = legacy.user_id
  where legacy.user_id = target_user and legacy.claim_id = request_id and legacy.claim_until > now()
    and account.raw_app_meta_data->'study_legacy_pending' = 'true'::jsonb
  for update of legacy;
  if not found then raise exception 'No active legacy claim'; end if;

  -- A reserved account cannot sign in until its password is set.
  if exists (select 1 from public.study_review_events where user_id = target_user) then
    raise exception 'Account already has review events';
  end if;
  delete from public.learning_states where user_id = target_user;
  delete from public.user_preferences where user_id = target_user;
  perform public.import_study_baseline(target_user, source_preferences, source_states, false);
end;
$$;

revoke execute on function public.reserve_study_legacy_claim(text, uuid) from public, anon, authenticated;
revoke execute on function public.release_study_legacy_claim(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.refresh_study_legacy_baseline(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_study_legacy_claim(text, uuid) to service_role;
grant execute on function public.release_study_legacy_claim(uuid, uuid) to service_role;
grant execute on function public.refresh_study_legacy_baseline(uuid, uuid, jsonb, jsonb) to service_role;
