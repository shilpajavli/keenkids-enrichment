-- Add Stripe columns to payments table
alter table payments
  add column if not exists stripe_session_id text unique,
  add column if not exists plan_name text,
  add column if not exists customer_email text,
  add column if not exists customer_name text,
  add column if not exists child_name_entered text,
  add column if not exists paid_at timestamptz;
