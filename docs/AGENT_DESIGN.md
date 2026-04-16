# Agent Design Document — Cam, The Concierge (Bookly)

This document describes how the conversational agent is designed and how it maps to the codebase. Operational playbooks for contact-center readers live under [`docs/aops/`](aops/README.md).

---

## 1. Architecture overview

### Components

| Layer | Responsibility |
|-------|----------------|
| **Client** | Next.js UI: [`components/ChatWidget.tsx`](../components/ChatWidget.tsx) calls HTTP APIs; optional `?debug=1` shows tool traces. |
| **Session API** | [`app/api/session/route.ts`](../app/api/session/route.ts) — deterministic onboarding: lookup customer + latest order in Supabase, build greeting via [`lib/greeting.ts`](../lib/greeting.ts), persist first assistant turn to `customer_history`. **Not** LLM-driven. |
| **Chat API** | [`app/api/chat/route.ts`](../app/api/chat/route.ts) — append user message, load transcript, invoke [`lib/agent/runAgent.ts`](../lib/agent/runAgent.ts), persist assistant reply. |
| **Agent loop** | OpenAI Chat Completions with **tools** (function calling): model may request tool calls; server executes [`lib/agent/toolExecutor.ts`](../lib/agent/toolExecutor.ts) and returns results until the model emits a final assistant message. |
| **Tools** | Schemas in [`lib/agent/toolDefinitions.ts`](../lib/agent/toolDefinitions.ts); execution hits Supabase (orders, returns, items, customers) and repo policy JSON via [`lib/policies/lookup.ts`](../lib/policies/lookup.ts). |
| **Memory** | Per-session **transcript** in `customer_history` (role + content); loaded each turn as chat history. No cross-session vector memory. |
| **Policies** | Canonical FAQ text in [`content/policies/topics.json`](../content/policies/topics.json); same source informs `/support` and the `lookup_policy` tool. |

### Data flow (one user message)

1. Browser `POST /api/chat` with `sessionId`, identity fields from session, and `userMessage`.
2. Server writes user row to `customer_history`, loads ordered history for `sessionId`.
3. `runAgent` sends **system prompt** + **history** + **tool definitions** to OpenAI.
4. Model responds with assistant text and/or **tool calls** with JSON arguments.
5. `toolExecutor` runs each call (DB query/write or policy lookup); results appended as **tool** messages in the internal loop.
6. Loop continues until the model returns content without further tool calls (capped by a max iteration guard in `runAgent`).
7. Final assistant string saved to `customer_history`; JSON response includes `reply` and optional `toolEvents` for debug.

### Where policy lives vs transactional data

- **Transactional truth** — customers, orders, order items, returns: **PostgreSQL (Supabase)**, defined and seeded by SQL under [`supabase/migrations/`](../supabase/migrations/).
- **Policy / FAQ copy** — short, curated snippets: **`content/policies/topics.json`**, retrieved by tool `lookup_policy` (keyword routing in [`lib/policies/lookup.ts`](../lib/policies/lookup.ts)), not embedded in the model weights.

---

## 2. Conversation and decision design

### Intent handling

The model infers intent from the user message plus **system instructions** in [`lib/agent/systemPrompt.ts`](../lib/agent/systemPrompt.ts):

- **Order tracking** — `get_order_status`, optionally `list_orders_for_email` when email-based listing is appropriate.
- **Path A (new return)** — `get_order_items` → `check_return_eligibility` → `create_return_request` when eligible; label URL comes from tool output.
- **Path B (existing return / refund status)** — `get_return_refund_status`; if ambiguous, ask whether the user is starting a return or checking status.
- **FAQ / policy** — `lookup_policy` with a topic keyword; answer must align with returned body text.

**AOPs** (`docs/aops/`) describe the same flows in plain language for non-engineers; prompts and tools are written to reflect those procedures.

### When to answer vs ask vs act

- **Answer from policy** when the question is general and `lookup_policy` returns a match.
- **Call tools** before stating order-specific facts (status, items, return/refund state).
- **Ask one clarifying question** when a required slot is missing (e.g. order id, which book) or when intent is ambiguous (e.g. “refund” without start vs status).
- **Decline or boundary** for out-of-scope requests (address changes, cancel in transit, live supervisor) per prompt rules—offer what Cam can do instead.

---

## 3. System prompt (representative content)

The full prompt is maintained in **[`lib/agent/systemPrompt.ts`](../lib/agent/systemPrompt.ts)** (`buildSystemPrompt`). It encodes:

- Persona (Cam, Bookly concierge) and whether the visitor is verified, guest, or unknown-email.
- Mandatory tool use for transactional facts; `lookup_policy` for FAQ; anti-hallucination rules (no invented tracking, dates, or shipping options not in policy).
- Path A vs Path B for returns; conservative use of refund **guidance** strings from [`lib/refund-timeline.ts`](../lib/refund-timeline.ts) inside tool results.
- Boundaries: supervisor requests, off-topic questions, demo limitations (e.g. no SMS in prototype).

A long verbatim paste is intentionally avoided here so a single source of truth remains in code; update the file when behavior changes.

---

## 4. Hallucination and safety controls

| Control | How it works |
|---------|----------------|
| **Tool grounding** | Order/return facts come only from tool JSON returned by `toolExecutor`; system prompt instructs the model not to invent labels, statuses, or bank timelines. |
| **Policy grounding** | FAQ answers must follow `lookup_policy` body text; if no topic matches, say the policy is unavailable in-prototype and point to Support. |
| **Refund copy** | `buildReturnRefundGuidance` in `refund-timeline.ts` supplies conservative worst-case language for processing/failed states so the model has bounded text to paraphrase. |
| **Demo dates** | [`lib/demo/order-dates.ts`](../lib/demo/order-dates.ts) normalizes in-transit ETAs in dev/Netlify so demos do not show stale “late” shipments purely from seed dates. |
| **Debug** | `?debug=1` exposes tool names, arguments, and results for review—not hidden chain-of-thought. |
| **Out of scope** | Prompt declines unsupported actions and redirects to supported capabilities. |

---

## 5. Production readiness

### Tradeoffs accepted for the prototype

- Lightweight identity (email lookup / guest); no OAuth or step-up verification.
- Server uses Supabase **service role** for speed; RLS is not the primary enforcement boundary for the API (prototype only).
- Mock prepaid label URL; no carrier or payment processor integration.
- Session memory = transcript table only; no long-term profile memory or CRM sync.
- No automated eval suite, rate limiting, or human escalation queue in-app.

### What would change for production

- **Auth & authorization** — real customer sessions; database access scoped to the authenticated user; minimize service-role surface.
- **Integrations** — OMS, carriers, payments/refunds with webhooks and idempotent processing; real notifications (email/SMS) with consent.
- **Operations** — structured logging, metrics, alerting; optional human handoff / ticketing tool.
- **Quality** — offline evals on golden transcripts; prompt/tool versioning tied to AOP revisions.
- **Compliance** — PII retention, accessibility, and regional requirements for support and messaging.

---

## Document maintenance

This narrative was completed to align the **written design brief** with the **implemented** prototype. For behavioral changes, update [`lib/agent/`](../lib/agent/), [`content/policies/`](../content/policies/), and [`docs/aops/`](aops/README.md) together, then reflect major decisions here as needed.

---

## Quick reference — implementation map

| Area | Location |
|------|----------|
| System prompt | `lib/agent/systemPrompt.ts` |
| Tool schemas | `lib/agent/toolDefinitions.ts` |
| Tool execution | `lib/agent/toolExecutor.ts` |
| Chat completion loop | `lib/agent/runAgent.ts` |
| Session + greeting | `app/api/session/route.ts`, `lib/greeting.ts` |
| Demo in-transit dates | `lib/demo/order-dates.ts` |
| Policies / FAQ | `content/policies/topics.json` |
