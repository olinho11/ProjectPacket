-- ProjectPacket plan-limit migration for existing Supabase projects.
-- Run this once in the Supabase SQL Editor after the original schema.

create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro', 'agency')),
  status text not null default 'active'
    check (status in ('trialing', 'active', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read own subscription" on public.subscriptions;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

insert into public.subscriptions (user_id, plan, status)
select auth.users.id, 'free', 'active'
from auth.users
on conflict (user_id) do nothing;

drop policy if exists "Users can manage own projects" on public.projects;
drop policy if exists "Users can read own projects" on public.projects;

create policy "Users can read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create or replace function public.projectpacket_plan_limit(input_plan text)
returns integer
language sql
stable
as $$
  select case input_plan
    when 'starter' then 5
    when 'pro' then 25
    when 'agency' then null
    else 1
  end
$$;

create or replace function public.enforce_project_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
  active_limit integer;
  current_plan text;
begin
  if new.status not in ('draft', 'sent', 'in_progress', 'overdue') then
    return new;
  end if;

  select coalesce(
    (
      select subscriptions.plan
      from public.subscriptions
      where subscriptions.user_id = new.user_id
      and subscriptions.status in ('trialing', 'active')
      order by subscriptions.created_at desc
      limit 1
    ),
    'free'
  )
  into current_plan;

  active_limit := public.projectpacket_plan_limit(current_plan);

  if active_limit is null then
    return new;
  end if;

  select count(*)
  into active_count
  from public.projects
  where projects.user_id = new.user_id
  and projects.status in ('draft', 'sent', 'in_progress', 'overdue')
  and projects.id <> new.id;

  if active_count >= active_limit then
    raise exception 'Free includes 1 active packet. Upgrade to Starter to manage up to 5 active packets.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_project_plan_limit_trigger on public.projects;

create trigger enforce_project_plan_limit_trigger
  before insert or update of user_id, status
  on public.projects
  for each row
  execute function public.enforce_project_plan_limit();
