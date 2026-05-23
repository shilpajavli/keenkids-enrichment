-- Migration: Add schools, enrollment tracking, sign events, and curriculum
-- Run this in Supabase SQL Editor on your existing database

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. SCHOOLS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.schools (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  location    text,
  created_at  timestamptz default now() not null
);

-- Seed JS and Mattos schools
insert into public.schools (name, location) values
  ('JS', 'JS Campus'),
  ('Mattos', 'Mattos Campus')
on conflict (name) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. UPDATE STUDENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add school_id column
alter table public.students 
  add column if not exists school_id uuid references public.schools(id) on delete set null;

-- Add enrollment_type column (5_day, 3_day, 1_day)
alter table public.students 
  add column if not exists enrollment_type text 
  check (enrollment_type in ('5_day','3_day','1_day')) 
  default '5_day';

-- Add enrolled_days column (array of weekday numbers: 0=Sun, 1=Mon, ... 5=Fri, 6=Sat)
alter table public.students 
  add column if not exists enrolled_days int[] default '{1,2,3,4,5}';

-- Update grade constraint to allow kindergarten (0)
alter table public.students drop constraint if exists students_grade_check;
alter table public.students add constraint students_grade_check check (grade between 0 and 12);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. UPDATE ATTENDANCE TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add sign-in/sign-out timestamps
alter table public.attendance 
  add column if not exists sign_in_time timestamptz;

alter table public.attendance 
  add column if not exists sign_out_time timestamptz;

-- Make class_id optional (some attendance may not be tied to a specific class)
alter table public.attendance 
  alter column class_id drop not null;

-- Drop old unique constraint and add new one (without class_id)
alter table public.attendance drop constraint if exists attendance_student_id_class_id_date_key;
alter table public.attendance drop constraint if exists attendance_student_id_date_key;
alter table public.attendance add constraint attendance_student_id_date_key unique (student_id, date);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SIGN EVENTS TABLE (detailed log with notification tracking)
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.sign_events (
  id                 uuid primary key default uuid_generate_v4(),
  student_id         uuid references public.students(id) on delete cascade not null,
  event_type         text not null check (event_type in ('sign_in', 'sign_out')),
  timestamp          timestamptz default now() not null,
  recorded_by        uuid references public.profiles(id) on delete set null,
  notified_at        timestamptz,
  notification_error text,
  created_at         timestamptz default now() not null
);

-- Index for fast lookups
create index if not exists sign_events_student_timestamp 
  on public.sign_events (student_id, timestamp desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. UPDATE ANNOUNCEMENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add school_id for school-specific announcements (null = all schools)
alter table public.announcements 
  add column if not exists school_id uuid references public.schools(id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. CURRICULUM TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.curriculum (
  id          uuid primary key default uuid_generate_v4(),
  school_id   uuid references public.schools(id) on delete cascade not null,
  title       text not null,
  description text,
  week_of     date not null,              -- Monday of the week
  content     jsonb default '[]'::jsonb,  -- structured curriculum items
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique (school_id, week_of)
);

-- Index for fast lookups by school and week
create index if not exists curriculum_school_week 
  on public.curriculum (school_id, week_of desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Schools: everyone can read
alter table public.schools enable row level security;
drop policy if exists "schools_read" on public.schools;
create policy "schools_read" on public.schools for select using (true);
drop policy if exists "schools_staff_write" on public.schools;
create policy "schools_staff_write" on public.schools for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);

-- Sign events
alter table public.sign_events enable row level security;
drop policy if exists "staff_all" on public.sign_events;
create policy "staff_all" on public.sign_events for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);
drop policy if exists "parent_own_sign_events" on public.sign_events;
create policy "parent_own_sign_events" on public.sign_events for select using (
  exists (select 1 from public.students s where s.id = student_id and s.parent_id = auth.uid())
);

-- Curriculum
alter table public.curriculum enable row level security;
drop policy if exists "staff_all" on public.curriculum;
create policy "staff_all" on public.curriculum for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);
drop policy if exists "parent_curriculum" on public.curriculum;
create policy "parent_curriculum" on public.curriculum for select using (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Curriculum updated_at trigger
drop trigger if exists curriculum_updated_at on public.curriculum;
create trigger curriculum_updated_at 
  before update on public.curriculum 
  for each row execute function handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! 
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verify the migration by running:
-- select * from public.schools;
-- \d public.students
-- \d public.attendance
-- \d public.sign_events
-- \d public.curriculum
