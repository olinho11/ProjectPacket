-- ProjectPacket submission agreement migration.
-- Run this once in Supabase SQL Editor for existing projects.

alter table public.submissions
add column if not exists accepted_creative_asset_only boolean not null default false;

alter table public.submissions
add column if not exists accepted_creative_asset_only_at timestamptz;
