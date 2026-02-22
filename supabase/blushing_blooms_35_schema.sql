-- Blushing Blooms (bb35) — tables only. No connection to other app schema.
-- Run in Supabase SQL editor (free tier is fine).

create table if not exists bb35_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default 'general',
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists bb35_contact_submissions_created_at on bb35_contact_submissions(created_at desc);

create table if not exists bb35_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  customer_email text,
  amount_total numeric(10,2),
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists bb35_orders_created_at on bb35_orders(created_at desc);

-- Optional: enable RLS and allow service role only (your API uses service role).
alter table bb35_contact_submissions enable row level security;
alter table bb35_orders enable row level security;

create policy "Service role only" on bb35_contact_submissions for all using (false);
create policy "Service role only" on bb35_orders for all using (false);
