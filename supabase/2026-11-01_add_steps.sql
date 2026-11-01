-- Run in Supabase SQL Editor if you already ran schema.sql before the steps feature was added.
-- Safe to execute again: table/index/grants and policy creation are idempotent.
create table if not exists public.step_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  steps integer not null check (steps between 0 and 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);
create index if not exists idx_step_logs_user_date on public.step_logs (user_id, log_date);
alter table public.step_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='step_logs' and policyname='steps: select own') then
    create policy "steps: select own" on public.step_logs for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='step_logs' and policyname='steps: insert own') then
    create policy "steps: insert own" on public.step_logs for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='step_logs' and policyname='steps: update own') then
    create policy "steps: update own" on public.step_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='step_logs' and policyname='steps: delete own') then
    create policy "steps: delete own" on public.step_logs for delete to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;
revoke all on public.step_logs from anon, authenticated;
grant select, insert, update, delete on public.step_logs to authenticated;
