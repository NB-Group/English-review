alter table public.learning_states
  add column if not exists scheduler_state jsonb;
