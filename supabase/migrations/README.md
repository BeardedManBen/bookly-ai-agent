# Supabase migrations

Run these scripts in the Supabase **SQL Editor** (or your migration runner) against the project you use for Bookly.

| File | Purpose |
|------|---------|
| `001_init.sql` | Creates tables, enables RLS, inserts demo customers/orders/items. **BK-10428** uses relative dates at insert time for the in-transit demo. |
| `002_returns_refund_status.sql` | Return/refund columns, checks, and Path B seed rows (**run after 001**). |
| `003_refund_failed_demo.sql` | Demo order **BK-40111** with **`refund_status: failed`** for Path B (**run after 002**). |

**Order:** run `001` → `002` → `003`.

Re-running is mostly idempotent for customers/orders; `order_items` and return seeds insert only when the target row is missing.
