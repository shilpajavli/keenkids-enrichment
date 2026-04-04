-- ─── Enable extensions ──────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles (extends Supabase auth.users) ──────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null unique,
  full_name   text not null,
  role        text not null check (role in ('admin','teacher','parent')) default 'parent',
  avatar_url  text,
  created_at  timestamptz default now() not null
);

-- ─── Students ────────────────────────────────────────────────────────────────
create table public.students (
  id              uuid primary key default uuid_generate_v4(),
  first_name      text not null,
  last_name       text not null,
  grade           int  not null check (grade between 1 and 12),
  date_of_birth   date,
  enrolled_at     date default current_date not null,
  avatar_url      text,
  parent_id       uuid references public.profiles(id) on delete set null,
  notes           text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  -- computed
  full_name text generated always as (first_name || ' ' || last_name) stored
);

-- ─── Classes ─────────────────────────────────────────────────────────────────
create table public.classes (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  day_of_week   int  not null check (day_of_week between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  color         text not null default 'purple',
  teacher_id    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz default now() not null
);

-- ─── Student ↔ Class enrollment ──────────────────────────────────────────────
create table public.enrollments (
  student_id  uuid references public.students(id) on delete cascade,
  class_id    uuid references public.classes(id)  on delete cascade,
  enrolled_at date default current_date,
  primary key (student_id, class_id)
);

-- ─── Attendance ───────────────────────────────────────────────────────────────
create table public.attendance (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid references public.students(id) on delete cascade not null,
  class_id    uuid references public.classes(id)  on delete cascade not null,
  date        date not null,
  status      text not null check (status in ('present','late','absent')) default 'present',
  note        text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique (student_id, class_id, date)
);

-- ─── Skills curriculum ───────────────────────────────────────────────────────
create table public.skills (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  subject     text not null,
  grade_level int  not null,
  "order"     int  not null default 0
);

-- ─── Student skill tracking ──────────────────────────────────────────────────
create table public.student_skills (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid references public.students(id) on delete cascade not null,
  skill_id    uuid references public.skills(id)   on delete cascade not null,
  status      text not null check (status in ('mastered','in_progress','not_started')) default 'not_started',
  mastered_at timestamptz,
  updated_at  timestamptz default now() not null,
  unique (student_id, skill_id)
);

-- ─── Teacher notes ───────────────────────────────────────────────────────────
create table public.teacher_notes (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid references public.students(id) on delete cascade not null,
  teacher_id  uuid references public.profiles(id) on delete set null,
  content     text not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- ─── Media ───────────────────────────────────────────────────────────────────
create table public.media (
  id                uuid primary key default uuid_generate_v4(),
  student_id        uuid references public.students(id) on delete set null,
  class_id          uuid references public.classes(id)  on delete set null,
  type              text not null check (type in ('photo','video')),
  url               text not null,
  thumbnail_url     text,
  caption           text,
  duration_seconds  int,
  uploaded_by       uuid references public.profiles(id) on delete set null not null,
  created_at        timestamptz default now() not null
);

-- ─── Payments ────────────────────────────────────────────────────────────────
create table public.payments (
  id                        uuid primary key default uuid_generate_v4(),
  parent_id                 uuid references public.profiles(id) on delete cascade not null,
  student_id                uuid references public.students(id) on delete cascade not null,
  amount_cents              int  not null,
  currency                  text not null default 'usd',
  status                    text not null check (status in ('paid','pending','overdue')) default 'pending',
  due_date                  date not null,
  paid_at                   timestamptz,
  stripe_payment_intent_id  text unique,
  invoice_url               text,
  created_at                timestamptz default now() not null
);

-- ─── Announcements ───────────────────────────────────────────────────────────
create table public.announcements (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  body        text not null,
  author_id   uuid references public.profiles(id) on delete set null,
  pinned      boolean default false not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.students      enable row level security;
alter table public.classes       enable row level security;
alter table public.enrollments   enable row level security;
alter table public.attendance    enable row level security;
alter table public.skills        enable row level security;
alter table public.student_skills enable row level security;
alter table public.teacher_notes enable row level security;
alter table public.media         enable row level security;
alter table public.payments      enable row level security;
alter table public.announcements enable row level security;

-- Admins & teachers see everything
create policy "staff_all" on public.students     for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);
create policy "staff_all" on public.attendance   for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);
create policy "staff_all" on public.media        for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);
create policy "staff_all" on public.payments     for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);
create policy "staff_all" on public.announcements for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);

-- Parents see only their child's data
create policy "parent_own_child" on public.students for select using (
  parent_id = auth.uid()
);
create policy "parent_own_attendance" on public.attendance for select using (
  exists (select 1 from public.students s where s.id = student_id and s.parent_id = auth.uid())
);
create policy "parent_own_media" on public.media for select using (
  student_id is null or
  exists (select 1 from public.students s where s.id = student_id and s.parent_id = auth.uid())
);
create policy "parent_own_payments" on public.payments for select using (
  parent_id = auth.uid()
);
create policy "parent_announcements" on public.announcements for select using (true);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger students_updated_at      before update on public.students      for each row execute function handle_updated_at();
create trigger attendance_updated_at    before update on public.attendance    for each row execute function handle_updated_at();
create trigger student_skills_updated_at before update on public.student_skills for each row execute function handle_updated_at();
create trigger teacher_notes_updated_at before update on public.teacher_notes for each row execute function handle_updated_at();
create trigger announcements_updated_at before update on public.announcements for each row execute function handle_updated_at();
