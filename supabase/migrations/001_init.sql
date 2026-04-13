-- Bookly prototype schema + seed data
-- Run in Supabase: SQL Editor → New query → paste → Run
-- Safe to re-run on empty DB only (drop statements optional for reset)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null check (
    status in ('placed', 'processing', 'in_transit', 'delivered', 'cancelled')
  ),
  placed_at timestamptz not null,
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery date,
  tracking_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  title text not null,
  price_cents int not null,
  return_eligible_until date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  status text not null default 'open',
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  customer_id uuid references public.customers (id) on delete set null,
  email text,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_history_session on public.customer_history (session_id);
create index if not exists idx_customer_history_customer on public.customer_history (customer_id);
create index if not exists idx_orders_customer on public.orders (customer_id);

-- ---------------------------------------------------------------------------
-- RLS (API uses service role — still lock public access by default)
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.returns enable row level security;
alter table public.customer_history enable row level security;

-- No policies for anon/authenticated: only service_role bypasses RLS.

-- ---------------------------------------------------------------------------
-- Seed (fixed UUIDs for predictable demos / README)
-- ---------------------------------------------------------------------------

insert into public.customers (id, first_name, last_name, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Ben', 'Carmichael', 'ben@example.com'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Sarah', 'Lee', 'sarah@example.com'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Alex', 'Kim', 'alex@example.com')
on conflict (email) do nothing;

insert into public.orders (
  id,
  public_id,
  customer_id,
  status,
  placed_at,
  shipped_at,
  delivered_at,
  estimated_delivery,
  tracking_number
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'BK-10428',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'in_transit',
    now() - interval '5 days',
    now() - interval '2 days',
    null,
    (timezone('utc', now()))::date + 1,
    '1Z999AA10123456784'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'BK-20111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'delivered',
    '2026-04-01T12:00:00Z',
    '2026-04-02T09:00:00Z',
    '2026-04-08T16:30:00Z',
    null,
    '1Z999AA10987654321'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'BK-30001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'delivered',
    '2026-02-10T12:00:00Z',
    '2026-02-12T09:00:00Z',
    '2026-02-15T11:00:00Z',
    null,
    '1Z999AA10555555555'
  )
on conflict (public_id) do nothing;

insert into public.order_items (order_id, title, price_cents, return_eligible_until)
select v.order_id, v.title, v.price_cents, v.return_eligible_until
from (
  values
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid,
      'The Left Hand of Darkness',
      1899,
      '2026-05-01'::date
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
      'Piranesi',
      1499,
      '2026-05-08'::date
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid,
      'Project Hail Mary',
      1699,
      '2026-03-15'::date
    )
) as v (order_id, title, price_cents, return_eligible_until)
where not exists (
  select 1
  from public.order_items oi
  where oi.order_id = v.order_id and oi.title = v.title
);
