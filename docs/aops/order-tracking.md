# AOP: Order tracking

**Related tools:** `get_order_status`, `list_orders_for_email`, (optional) `get_order_items`

---

## Purpose

Help a customer understand where their Bookly order is and when to expect it.

---

## When this procedure applies

- They ask “where is my order,” “tracking,” “delivery,” or say **yes** to the proactive in-transit prompt.
- They give an **order number** like `BK-10428`, **or** they prefer to use the **email on their Bookly account** instead of remembering the number.

---

## Information we need

| Information | Why | If missing |
|-------------|-----|------------|
| Order number **or** confirmed account email | Pull exact status from the system | Ask once which they prefer |
| Email that exists in Bookly | Required for `list_orders_for_email` | If not found, explain and offer guest + order number |

---

## Steps

1. If they only give **email** (or want email lookup), call `list_orders_for_email` after they confirm the address. Summarize **all** their orders with status and important dates (**placed**, **delivered**). **Call out in-transit orders first** so those do not get buried.
2. If they give an **order number**, call `get_order_status` with that id.
3. Reply using **only** what the tool returned (status, dates, tracking). If the order is missing, say so honestly.
4. Do **not** tell the customer you can “only” search by order number if email lookup is available and their email matches an account.
5. Offer a next step (e.g. return flow, policy link) only if it fits what they asked.

---

## What we never do

- Guess a carrier, ETA, or tracking number.
- Promise a delivery date that isn’t in the tool output.
