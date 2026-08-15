alter table payments
  add column if not exists payment_type text default 'tuition'
  check (payment_type in ('enrollment', 'tuition', 'prorated', 'other'));

-- Auto-tag $100 Stripe payments as enrollment fee
update payments set payment_type = 'enrollment'
where amount_cents = 10000 and stripe_session_id is not null;

-- Tag prorated (no stripe session, pending/paid, amount not matching standard monthly)
update payments set payment_type = 'prorated'
where stripe_session_id is null and amount_cents not in (69900, 45000, 22000);
