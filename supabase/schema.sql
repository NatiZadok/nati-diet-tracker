-- NATI DIET TRACKER · Initial database schema
-- Run once in Supabase SQL Editor, after creating a Supabase project.
-- App credentials: ONLY the publishable/anon key, NEVER a service_role key.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  start_date date not null default '2026-11-01',
  target_weight numeric(5,2),
  created_at timestamptz not null default now(),
  constraint target_weight_valid check (target_weight is null or target_weight between 25 and 400)
);

create table if not exists public.meal_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_number smallint not null check (meal_number between 1 and 4),
  choices jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date, meal_number),
  constraint choices_is_object check (jsonb_typeof(choices) = 'object')
);

-- One daily step count per owner, private by default (not included in shared progress).
create table if not exists public.step_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  steps integer not null check (steps between 0 and 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

create table if not exists public.weight_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric(5,2) not null check (weight_kg between 20 and 400),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

create table if not exists public.measurement_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  right_arm numeric(6,2),
  chest numeric(6,2),
  narrow_waist numeric(6,2),
  navel_waist numeric(6,2),
  hips numeric(6,2),
  right_thigh numeric(6,2),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date),
  constraint measure_range check (
    (right_arm is null or right_arm between 10 and 300) and
    (chest is null or chest between 10 and 300) and
    (narrow_waist is null or narrow_waist between 10 and 300) and
    (navel_waist is null or navel_waist between 10 and 300) and
    (hips is null or hips between 10 and 300) and
    (right_thigh is null or right_thigh between 10 and 300)
  )
);

create table if not exists public.progress_shares (
  owner_id uuid not null references auth.users(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  share_weight boolean not null default true,
  share_measurements boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  constraint share_not_self check (owner_id <> viewer_id),
  constraint share_something check (share_weight or share_measurements)
);

create table if not exists public.progress_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null check (length(trim(invitee_email)) between 3 and 320),
  inviter_name text not null default '',
  share_weight boolean not null default true,
  share_measurements boolean not null default false,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz,
  constraint invite_something check (share_weight or share_measurements)
);

create index if not exists idx_meal_logs_user_month on public.meal_logs (user_id,log_date);
create index if not exists idx_step_logs_user_date on public.step_logs (user_id, log_date);
create index if not exists idx_weight_logs_user_date on public.weight_logs (user_id,log_date);
create index if not exists idx_measurement_logs_user_date on public.measurement_logs (user_id,log_date);
create index if not exists idx_progress_invites_email on public.progress_invites (lower(invitee_email));
create index if not exists idx_progress_shares_viewer on public.progress_shares (viewer_id);

-- Create a private profile whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email,'@',1)))
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Optional one-time backfill for people signed up before this schema was created.
insert into public.profiles(id, display_name)
select id, coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email,'@',1))
from auth.users on conflict(id) do nothing;

-- Secure invitation acceptance: a signed-in user may accept ONLY an unexpired
-- invitation addressed to their authenticated email. The share is created
-- server-side, not by trusting a viewer_id submitted by the browser.
create or replace function public.accept_progress_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.progress_invites%rowtype;
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or v_email is null then
    raise exception 'Authentication required';
  end if;

  select * into v_inv from public.progress_invites
    where id = p_invite_id and lower(invitee_email) = v_email
    and status = 'pending' and expires_at > now()
    for update;
  if not found then
    raise exception 'This invitation is unavailable or expired';
  end if;
  if v_inv.owner_id = auth.uid() then
    raise exception 'You cannot share with yourself';
  end if;

  insert into public.progress_shares(owner_id, viewer_id, share_weight, share_measurements)
  values (v_inv.owner_id, auth.uid(), v_inv.share_weight, v_inv.share_measurements)
  on conflict (owner_id, viewer_id) do update
    set share_weight = excluded.share_weight,
        share_measurements = excluded.share_measurements;

  update public.progress_invites set status = 'accepted', accepted_at = now()
  where id = p_invite_id;
end;
$$;

-- RLS is the actual access boundary, not the React interface.
alter table public.profiles enable row level security;
alter table public.meal_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.step_logs enable row level security;
alter table public.measurement_logs enable row level security;
alter table public.progress_shares enable row level security;
alter table public.progress_invites enable row level security;

create policy "profiles: own or shared owner's name" on public.profiles for select to authenticated
using (id = (select auth.uid()) or exists (
  select 1 from public.progress_shares s where s.owner_id = profiles.id and s.viewer_id = (select auth.uid())
));
create policy "profiles: update self" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "meals: select own" on public.meal_logs for select to authenticated
using (user_id = (select auth.uid()));
create policy "meals: insert own" on public.meal_logs for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "meals: update own" on public.meal_logs for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "meals: delete own" on public.meal_logs for delete to authenticated
using (user_id = (select auth.uid()));

create policy "steps: select own" on public.step_logs for select to authenticated
using (user_id = (select auth.uid()));
create policy "steps: insert own" on public.step_logs for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "steps: update own" on public.step_logs for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "steps: delete own" on public.step_logs for delete to authenticated
using (user_id = (select auth.uid()));

create policy "weights: select own or explicitly shared" on public.weight_logs for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.progress_shares s where s.owner_id = weight_logs.user_id
  and s.viewer_id = (select auth.uid()) and s.share_weight
));
create policy "weights: insert own" on public.weight_logs for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "weights: update own" on public.weight_logs for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "weights: delete own" on public.weight_logs for delete to authenticated
using (user_id = (select auth.uid()));

create policy "measurements: select own or explicitly shared" on public.measurement_logs for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.progress_shares s where s.owner_id = measurement_logs.user_id
  and s.viewer_id = (select auth.uid()) and s.share_measurements
));
create policy "measurements: insert own" on public.measurement_logs for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "measurements: update own" on public.measurement_logs for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "measurements: delete own" on public.measurement_logs for delete to authenticated
using (user_id = (select auth.uid()));

create policy "shares: owner or viewer read" on public.progress_shares for select to authenticated
using (owner_id = (select auth.uid()) or viewer_id = (select auth.uid()));
create policy "shares: owner edits flags" on public.progress_shares for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "shares: owner revokes" on public.progress_shares for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "invites: owner or invited email reads" on public.progress_invites for select to authenticated
using (owner_id = (select auth.uid()) or lower(invitee_email) = lower(auth.jwt() ->> 'email'));
create policy "invites: owner creates" on public.progress_invites for insert to authenticated
with check (owner_id = (select auth.uid()) and status = 'pending' and expires_at > now());
create policy "invites: owner or recipient removes" on public.progress_invites for delete to authenticated
using (owner_id = (select auth.uid()) or lower(invitee_email) = lower(auth.jwt() ->> 'email'));

-- Minimize grants and prevent client tampering with owner_id or grant recipient IDs.
revoke all on public.profiles, public.meal_logs, public.weight_logs,
  public.measurement_logs, public.step_logs, public.progress_shares, public.progress_invites from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name, start_date, target_weight) on public.profiles to authenticated;
grant select, insert, update, delete on public.step_logs to authenticated;
grant select, insert, update, delete on public.meal_logs, public.weight_logs,
  public.measurement_logs to authenticated;
grant select, delete on public.progress_shares to authenticated;
grant update(share_weight, share_measurements) on public.progress_shares to authenticated;
grant select, insert, delete on public.progress_invites to authenticated;

revoke all on function public.accept_progress_invite(uuid) from public, anon, authenticated;
grant execute on function public.accept_progress_invite(uuid) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
