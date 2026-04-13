-- Demo: refund failed at bank (Path B). Run after 002_returns_refund_status.sql.

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
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    'BK-40111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'delivered',
    '2026-03-20T12:00:00Z',
    '2026-03-21T09:00:00Z',
    '2026-03-25T16:00:00Z',
    null,
    '1Z999AA10444444444'
  )
on conflict (public_id) do nothing;

insert into public.order_items (order_id, title, price_cents, return_eligible_until)
select v.order_id, v.title, v.price_cents, v.return_eligible_until
from (
  values
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4'::uuid,
      'Refund Failure Demo',
      1299,
      '2026-04-25'::date
    )
) as v (order_id, title, price_cents, return_eligible_until)
where not exists (
  select 1
  from public.order_items oi
  where oi.order_id = v.order_id and oi.title = v.title
);

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
  'failed',
  '2026-04-02T14:00:00Z'::timestamptz,
  null,
  'https://labels.bookly.example/r/demo-bk40111-failed',
  'Demo seed: refund failed at bank'
from public.order_items oi
join public.orders o on o.id = oi.order_id
where
  o.public_id = 'BK-40111'
  and oi.title = 'Refund Failure Demo'
  and not exists (
    select 1 from public.returns r where r.order_item_id = oi.id
  );
