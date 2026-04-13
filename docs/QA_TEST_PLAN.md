# Bookly + Cam — QA test plan (prototype)

Use this checklist while testing locally (`npm run dev`) or on Netlify.  
**Tip:** Open the site with **`?debug=1`** when you want to confirm tool names, arguments, and JSON results. Debug shows **tool grounding only**, not hidden model reasoning (the API does not expose it).

---

## Prerequisites (before any case)

| # | Check |
|---|--------|
| P1 | `.env` has valid `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. |
| P2 | Supabase has run **`001_init.sql`**, **`002_returns_refund_status.sql`**, then **`003_refund_failed_demo.sql`**. |
| P3 | Browser: hard refresh; optional incognito to avoid extension hydration noise. |

**Demo accounts**

| Email | Role |
|-------|------|
| `ben@example.com` | In-transit order **BK-10428** |
| `sarah@example.com` | Recent delivery **BK-20111** (+ seeded return Path B) |
| `alex@example.com` | Older delivery **BK-30001** (+ seeded return Path B); also **BK-40111** “Refund Failure Demo” (**failed** refund Path B) after **003** |

---

## 1. Chat entry & session

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| S1 | Email + known customer | Open widget → enter `ben@example.com` → Continue with email | Loading, then **short** proactive line: order **BK-10428** on the way + **ETA question** (no tracking dump in opening line). |
| S2 | Continue as guest | Open widget → Continue as guest | Generic Cam greeting; no proactive order line. |
| S3 | Unknown email | Enter `not-in-db@example.com` → Continue with email | Greeting says **email not found**; offers **retry email** or **guest** flow; no crash. |
| S4 | Invalid submit | Leave email empty → Continue with email | Validation error; stays on email step. |
| S5 | Support page widget | Go to `/support` → open chat | Same widget behavior as home. |
| S6 | Close ends session | Chat once → **Close** (or backdrop) | **CSAT** (resolved + stars) or **Skip**; reopening chat starts **fresh** (no old thread). |

---

## 2. Order tracking

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| O1 | Known user + order | As Ben (S1) → ask “Where is BK-10428?” or use **Track Order** then provide number | **`get_order_status`** (debug); reply matches tool (status, tracking, ETA)—no invented facts. |
| O2 | Guest + order | As guest (S2) → “Where is order BK-10428?” | Tool lookup by order id only; grounded reply. |
| O3 | Missing order number | Ask “Where’s my order?” without id | Cam asks for **order number** or **account email** (not “only order number”). |
| O4 | Email lookup | As Alex → “What orders do I have?” or give `alex@example.com` | **`list_orders_for_email`**; lists orders; highlights **in_transit** first if any. |
| O5 | Bad order id | Ask for `BK-99999` | Tool says not found; Cam does not invent tracking. |

---

## 3. Path A — Start return (new return)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| R1 | Eligible item | Guest or Ben → return flow for **BK-10428**, item **The Left Hand of Darkness** | **`check_return_eligibility`** then **`create_return_request`**; response includes **`label_url`**; explains ship + refund after inspection. |
| R2 | Ineligible / wrong item | Ask return on nonsense item title | Eligibility false or “no match”; no **`create_return_request`** unless user confirms appropriately. |
| R3 | Quick reply | Tap **Start a return**; complete minimal info | Same Path A tools as appropriate. |

**Note:** **BK-20111** already has a seeded return on Piranesi—use **BK-10428** for a clean **new** return demo.

---

## 4. Path B — Refund / return status

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| B1 | Processing refund | Ask “What’s the status of my refund?” for order **BK-20111** (mention Piranesi if needed) | **`get_return_refund_status`**; `refund_status` **processing**; reply aligns with tool **`guidance`**. |
| B2 | Completed refund | Ask refund status for **BK-30001** / **Project Hail Mary** | **`get_return_refund_status`**; **completed** + `refund_processed_at`; timeframe language consistent with policy (~5 business days after processed). |
| B3 | No return on file | Ask refund status for **BK-10428** before R1 (or if no return row) | Tool returns empty returns; Cam says none on file and points to starting a return. |
| B4 | Quick reply | Tap **Refund status**; give order when asked | **`get_return_refund_status`** when order known. |
| B5 | Failed refund | After **003**, ask refund status for **BK-40111** / **Refund Failure Demo** | **`get_return_refund_status`**; **`refund_status` `failed`**; copy mentions bank failure + production **SMS** note per guidance. |

---

## 5. FAQ / policy

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| F1 | Shipping | Ask “How long does shipping take?” | **`lookup_policy`** (or equivalent); answer matches **`/support`** / `topics.json`. |
| F2 | Returns policy | Ask high-level returns | Policy-grounded; no invented rules. |
| F3 | Password | Ask password reset | **`lookup_policy`** `password_reset` or similar. |
| F4 | Concierge hours | Ask when support is open | Matches **contact** topic (hours + Eastern). |
| F5 | Guest FAQ | As guest, ask F1–F4 | No email required; still grounded. |
| F6 | Expedited shipping | Ask “Can I pay for 2-day shipping?” | **`lookup_policy`** / grounded: **no** paid expedited in prototype; **no** “maybe at checkout” unless policy says so. |
| F7 | Off-topic | Ask unrelated news question | Polite **Bookly-only** deflection; no invented world facts. |

---

## 6. Out of scope (guardrails)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| X1 | Change address | “Change my shipping address” | Polite decline; offers what Cam can do. |
| X2 | Cancel in-transit | “Cancel my shipment” | Decline / boundary; no fake cancellation. |
| X3 | Human handoff | “I want to speak to a manager” / supervisor | Boundary; **empathy**; offers what Cam can do or **closing chat**; no fake escalation. |

---

## 7. UI / UX (light)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| U1 | Quick replies | In chat, tap each chip | Message sends; Cam responds without console errors. |
| U2 | Debug strip | `?debug=1` → send message that triggers a tool | Tool trace lists name + args + result JSON; explainer text notes **no chain-of-thought**. |
| U3 | Close overlay | Open chat → click backdrop | Same as **Close**: CSAT when applicable, then fresh session on reopen. |
| U4 | Branding | Skim landing + widget header | Bookly + Cam assets and teal/sky theme load. |

---

## 8. Data persistence (optional)

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| D1 | History rows | After a short chat, open **Supabase → `customer_history`** | Rows for `session_id` with `user` / `assistant` turns; meta on greeting if present. |

---

## Sign-off

| Area | Pass? | Notes |
|------|-------|-------|
| Session / entry |  |  |
| Order tracking |  |  |
| Path A return |  |  |
| Path B refund status |  |  |
| FAQ |  |  |
| Guardrails |  |  |
| UI / debug |  |  |

**Tester:** _______________ **Date:** _______________ **Build / URL:** _______________
