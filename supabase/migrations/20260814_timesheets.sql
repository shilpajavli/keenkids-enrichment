-- Teacher time entries
create table if not exists time_entries (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references profiles(id) on delete cascade,
  school_id     uuid references schools(id) on delete set null,
  date          date not null,
  clock_in      timestamptz not null,
  clock_out     timestamptz,
  hours         numeric(4,2),           -- computed on clock-out, max 3
  notes         text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by   uuid references profiles(id) on delete set null,
  approved_at   timestamptz,
  hourly_rate   numeric(6,2),           -- snapshot of rate at time of entry
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(teacher_id, date)              -- one entry per teacher per day
);

-- Hourly rates per teacher (admin sets these)
create table if not exists teacher_rates (
  teacher_id    uuid primary key references profiles(id) on delete cascade,
  hourly_rate   numeric(6,2) not null default 0,
  updated_at    timestamptz not null default now()
);

-- RLS
alter table time_entries enable row level security;
alter table teacher_rates enable row level security;

-- Teachers can read/write their own entries
create policy "teacher_own_entries" on time_entries
  for all using (teacher_id = auth.uid());

-- Admins can read/write all entries
create policy "admin_all_entries" on time_entries
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Only admins can read/write rates
create policy "admin_rates" on teacher_rates
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Teachers can read their own rate
create policy "teacher_own_rate" on teacher_rates
  for select using (teacher_id = auth.uid());
