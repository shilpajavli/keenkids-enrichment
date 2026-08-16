alter table students
  add column if not exists status text default 'active'
  check (status in ('active', 'inactive'));
