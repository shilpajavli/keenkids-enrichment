-- Migration: Wire program_id across students/classes and link programs to schools
-- Run this in the Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. LINK PROGRAMS TO SCHOOLS
--    Lets curriculum and announcements (which use school_id) filter by program
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.programs
  add column if not exists school_id uuid references public.schools(id) on delete set null;

-- Wire existing programs to schools by matching names
update public.programs p
set school_id = s.id
from public.schools s
where lower(s.name) = lower(p.name)
  and p.school_id is null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ADD program_id TO STUDENTS
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.students
  add column if not exists program_id uuid references public.programs(id) on delete set null;

-- Back-fill: match students to programs via their school_id
update public.students st
set program_id = p.id
from public.programs p
where p.school_id = st.school_id
  and st.program_id is null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ADD program_id TO CLASSES
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.classes
  add column if not exists program_id uuid references public.programs(id) on delete set null;
