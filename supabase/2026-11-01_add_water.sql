-- NATI DIET TRACKER | Safe one-time upgrade for an existing Supabase project.
-- Existing meals, users, steps, weight and measurement logs remain untouched.
-- Paste this entire file into Supabase -> SQL Editor -> New query -> Run.

begin;
create table if not exists public.water_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  ml integer not null check (ml between 0 and 15000),
  updated_at timestamptz not null default now(),
  primary key(user_id, log_date)
);
create index if not exists idx_water_logs_user_date on public.water_logs(user_id,log_date);
alter table public.water_logs enable row level security;
drop policy if exists "water: select own" on public.water_logs;
drop policy if exists "water: insert own" on public.water_logs;
drop policy if exists "water: update own" on public.water_logs;
drop policy if exists "water: delete own" on public.water_logs;
create policy "water: select own" on public.water_logs for select to authenticated using (user_id = (select auth.uid()));
create policy "water: insert own" on public.water_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "water: update own" on public.water_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "water: delete own" on public.water_logs for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.water_logs from anon,authenticated;
grant select,insert,update,delete on public.water_logs to authenticated;
commit;
