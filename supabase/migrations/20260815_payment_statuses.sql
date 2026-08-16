-- Add new payment statuses and cancellation tracking
alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('paid', 'pending', 'overdue', 'refunded', 'cancelled'));

alter table payments
  add column if not exists refund_amount_cents integer,
  add column if not exists refunded_at timestamptz,
  add column if not exists cancellation_notes text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists stripe_refund_id text;
