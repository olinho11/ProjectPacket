-- ProjectPacket schema.
-- Run this once in Supabase SQL Editor.
-- This creates the real database shape for signed-in freelancers.
-- Public client upload links should be added next through safe server routes/RPC,
-- not broad anonymous table access.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  business_name text not null default 'My Studio',
  brand_color text not null default '#2563eb',
  created_at timestamptz not null default now()
);

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

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  name text not null,
  due_date date not null,
  status text not null default 'sent'
    check (status in ('draft', 'sent', 'in_progress', 'completed', 'overdue')),
  token text not null unique default ('packet_' || replace(gen_random_uuid()::text, '-', '')),
  access_passcode_hash text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null check (type in ('file', 'text', 'link', 'approval')),
  required boolean not null default true,
  status text not null default 'requested'
    check (status in ('requested', 'submitted', 'approved', 'changes_requested', 'waived')),
  sort_order integer not null default 1,
  change_request_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items(id) on delete cascade,
  file_name text,
  file_path text,
  text_value text,
  link_value text,
  approved_value boolean,
  accepted_creative_asset_only boolean not null default false,
  accepted_creative_asset_only_at timestamptz,
  client_comment text not null default '',
  submitted_at timestamptz not null default now(),
  unique(checklist_item_id)
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null check (type in ('file', 'text', 'link', 'approval')),
  required boolean not null default true,
  sort_order integer not null default 1
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.checklist_items enable row level security;
alter table public.submissions enable row level security;
alter table public.templates enable row level security;
alter table public.template_items enable row level security;
alter table public.activity_logs enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can manage own checklist items"
  on public.checklist_items for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = checklist_items.project_id
      and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = checklist_items.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can manage own submissions"
  on public.submissions for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = submissions.project_id
      and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = submissions.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can manage own templates"
  on public.templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own template items"
  on public.template_items for all
  using (
    exists (
      select 1 from public.templates
      where templates.id = template_items.template_id
      and templates.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.templates
      where templates.id = template_items.template_id
      and templates.user_id = auth.uid()
    )
  );

create policy "Users can manage own activity logs"
  on public.activity_logs for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = activity_logs.project_id
      and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = activity_logs.project_id
      and projects.user_id = auth.uid()
    )
  );

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

insert into storage.buckets (id, name, public)
values ('projectpacket-files', 'projectpacket-files', false)
on conflict (id) do nothing;
