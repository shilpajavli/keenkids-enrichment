-- Migration: Add programs table and seed Sinnott
-- Run this in the Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. PROGRAMS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.programs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  location    text,
  start_date  date,
  end_date    date,
  created_at  timestamptz default now() not null
);

-- Add unique constraint if it doesn't already exist
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.programs'::regclass and contype = 'u'
    and conname = 'programs_name_key'
  ) then
    alter table public.programs add constraint programs_name_key unique (name);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.programs enable row level security;

drop policy if exists "programs_read" on public.programs;
create policy "programs_read" on public.programs for select using (true);

drop policy if exists "programs_staff_write" on public.programs;
create policy "programs_staff_write" on public.programs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SEED PROGRAMS (including Sinnott)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.programs (name, location) values
  ('Mattos', 'Mattos Campus'),
  ('Sinnott', 'Sinnott Campus')
on conflict (name) do nothing;

-- Also add Sinnott to schools table
insert into public.schools (name, location) values
  ('Sinnott', 'Sinnott Campus')
on conflict (name) do nothing;
