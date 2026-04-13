-- Return / refund status model (run after 001_init.sql)
-- Supabase: SQL Editor → New query → Run

-- ---------------------------------------------------------------------------
-- New columns (replace legacy `status` on returns)
-- ---------------------------------------------------------------------------

alter table public.returns
  add column if not exists return_status text not null default 'not_requested',
  add column if not exists refund_status text not null default 'not_requested',
  add column if not exists return_processed_date timestamptz,
  add column if not exists refund_processed_at timestamptz,
  add column if not exists label_url text;

-- Migrate rows that still use legacy `status`
update public.returns
set
  return_status = 'label_sent',
  refund_status = 'requested_not_started'
where
  exists (
    select 1
    from information_schema.columns c
    where
      c.table_schema = 'public'
      and c.table_name = 'returns'
      and c.column_name = 'status'
  )
  and status = 'open'
  and return_status = 'not_requested';

alter table public.returns drop column if exists status;

alter table public.returns drop constraint if exists returns_return_status_check;
alter table public.returns drop constraint if exists returns_refund_status_check;

alter table public.returns
  add constraint returns_return_status_check check (
    return_status in (
      'not_requested',
      'label_sent',
      'in_transit',
      'received',
      'inspecting',
      'closed_approved',
      'closed_declined'
    )
  );

alter table public.returns
  add constraint returns_refund_status_check check (
    refund_status in (
      'not_requested',
      'requested_not_started',
      'processing',
      'completed',
      'failed'
    )
  );

-- ---------------------------------------------------------------------------
-- Path B demo rows (idempotent)
-- ---------------------------------------------------------------------------

-- BK-20111 / Piranesi: return received, refund processing
insert into public.returns (
  order_item_id,
  return_status,
  refund_status,
  return_processed_date,
  refund_processed_at,
  label_url,
  reason
)
select
  oi.id,
  'received',
  'processing',
  '2026-04-09T15:00:00Z'::timestamptz,
  null,
  'https://labels.bookly.example/r/demo-bk20111-piranesi',
  'Demo seed: refund in progress'
from public.order_items oi
join public.orders o on o.id = oi.order_id
where
  o.public_id = 'BK-20111'
  and oi.title = 'Piranesi'
  and not exists (
    select 1 from public.returns r where r.order_item_id = oi.id
  );

-- BK-30001 / Project Hail Mary: return approved, refund completed (fixed date for comms demo)
insert into public.returns (
  order_item_id,
  return_status,
  refund_status,
  return_processed_date,
  refund_processed_at,
  label_url,
  reason
)
select
  oi.id,
  'closed_approved',
  'completed',
  '2026-04-04T11:00:00Z'::timestamptz,
  '2026-04-07T12:00:00Z'::timestamptz,
  'https://labels.bookly.example/r/demo-bk30001-hailmary',
  'Demo seed: refund completed'
from public.order_items oi
join public.orders o on o.id = oi.order_id
where
  o.public_id = 'BK-30001'
  and oi.title = 'Project Hail Mary'
  and not exists (
    select 1 from public.returns r where r.order_item_id = oi.id
  );
