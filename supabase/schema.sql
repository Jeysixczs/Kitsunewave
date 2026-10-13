-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- One row per person; the whole library (watch list, bookmarks, watched, continue
-- watching, history) is stored as JSON. Row Level Security makes every row readable
-- and writable only by its owner.

create table if not exists public.user_library (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_library enable row level security;

create policy "Read own library"   on public.user_library for select to authenticated using (auth.uid() = user_id);
create policy "Create own library" on public.user_library for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own library" on public.user_library for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own library" on public.user_library for delete to authenticated using (auth.uid() = user_id);
