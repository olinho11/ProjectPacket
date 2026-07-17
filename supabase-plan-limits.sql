-- ProjectPacket plan, packet slot, packet access, and template-limit migration.
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

alter table public.projects
  add column if not exists access_passcode_hash text,
  add column if not exists expires_at timestamptz;

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
  packet_count integer;
  packet_limit integer;
  current_plan text;
begin
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

  packet_limit := public.projectpacket_plan_limit(current_plan);

  if packet_limit is null then
    return new;
  end if;

  select count(*)
  into packet_count
  from public.projects
  where projects.user_id = new.user_id
  and projects.id <> new.id;

  if packet_count >= packet_limit then
    raise exception 'Free includes 1 packet slot. Delete a packet to free the slot, or upgrade for more.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_project_plan_limit_trigger on public.projects;

create trigger enforce_project_plan_limit_trigger
  before insert or update of user_id
  on public.projects
  for each row
  execute function public.enforce_project_plan_limit();

create or replace function public.projectpacket_custom_template_limit(input_plan text)
returns integer
language sql
stable
as $$
  select case input_plan
    when 'starter' then null
    when 'pro' then null
    when 'agency' then null
    else 2
  end
$$;

create or replace function public.enforce_template_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  template_count integer;
  template_limit integer;
  current_plan text;
begin
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

  template_limit := public.projectpacket_custom_template_limit(current_plan);

  if template_limit is null then
    return new;
  end if;

  select count(*)
  into template_count
  from public.templates
  where templates.user_id = new.user_id
  and templates.id <> new.id;

  if template_count >= template_limit then
    raise exception 'Free includes 2 custom templates. Upgrade for unlimited templates.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_template_plan_limit_trigger on public.templates;

create trigger enforce_template_plan_limit_trigger
  before insert or update of user_id
  on public.templates
  for each row
  execute function public.enforce_template_plan_limit();
