# AOP: Returns and refunds (two paths)

**Related tools:** `list_orders_for_email`, `get_order_items`, `check_return_eligibility`, `create_return_request`, `get_return_refund_status`, `lookup_policy`

**Placeholder:** SMS when refund completes or **fails at the bank** → see `lib/integrations/sms-placeholder.ts` (wire in a full product). In production we would **proactively SMS or email** on **refund `failed`** so the customer is not left waiting.

---

## Purpose

Handle **starting a return** (Path A) separately from **checking return/refund status** (Path B). Refunds are tied to returns in this MVP; Path B only reads rows already in `returns`.

---

## When this procedure applies

- **Path A:** “I want to return,” “send it back,” “start a refund” (meaning *begin* the process).
- **Path B:** “Where’s my refund,” “was my refund sent,” “status of my return”—meaning *existing* return/refund.
- **Ambiguous:** they only say “refund” → ask one question: start a new return, or check an existing one?

---

## Information we need

| Information | Why | If missing |
|-------------|-----|------------|
| Order number **or** email on a Bookly account | Find order(s) and returns | Ask once; use `list_orders_for_email` when they use email |
| Which item (Path A) | Multiple line items | List titles proactively |
| Which item (Path B) | Multiple returns | Optional filter; ask if unclear |

---

## Path A — Start return

1. Confirm they want to **open a new return** (not only check status).
2. Resolve the order: **order number** or **`list_orders_for_email`**. If **several orders**, list them with **delivery dates** so they can pick the right one.
3. Call **`get_order_items`** and **list book titles** without making the customer guess. If there is **only one** book on that order, **confirm that title** with them instead of asking them to “list” what they bought.
4. Use `check_return_eligibility` for the item they chose.
5. If not eligible, explain from tool output; do not invent rules.
6. If eligible and they confirm, call `create_return_request`.
7. Share **`label_url`** from the tool (mock prepaid label). Explain pack/ship steps and that **refund runs after receipt and inspection**. Use `lookup_policy` topic `returns` for policy language.

**Return states (reference):** `not_requested` → `label_sent` → `in_transit` → `received` → `inspecting` → `closed_approved` / `closed_declined`.

**Refund states (reference):** alongside return, e.g. `requested_not_started` → `processing` → `completed` / `failed`.

---

## Path B — Refund / return status

1. Confirm they want **status** on something already submitted.
2. Call `get_return_refund_status` with `order_public_id` (and `item_title` if they named a book). Use email + `list_orders_for_email` first if they do not know the order id.
3. If **no returns** on file: say so clearly; offer Path A (how to start a return).
4. If returns exist: use each row’s **`guidance`** and factual fields (`return_status`, `refund_status`, `return_processed_date`, `refund_processed_at`, `label_url`).
5. **Processing refunds:** give **conservative worst-case** timing for when the refund might finish and when money might **show in their account** (upper bounds, not promises), using the guidance string from the tool.
6. **`refund_status` = `failed`:** explain that the payout did **not** complete at the bank or card network; suggest they check with their bank. In a **full** Bookly agent we would **proactively SMS/email** when this happens (this chat prototype does not send SMS).

**Demo data:** e.g. `BK-40111` / “Refund Failure Demo” seeds a **failed** refund for testing copy and tools.

---

## What we never do

- Promise a refund timeline not grounded in tool output or policy.
- Create a return without a matching item on the order.
- For Path B, pretend a return exists when the tool says the list is empty.
