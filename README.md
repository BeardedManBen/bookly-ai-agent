# Bookly — Customer Support Agent (Cam, The Concierge)

Prototype conversational support for **Bookly**, a fictional online bookstore. The agent is **Cam, The Concierge**; the product brand stays **Bookly**.

This repo is scoped for a **design + prototype** exercise: thoughtful conversation design, tool use, and clear documentation—not production-hardening.

### Git and secrets

- **Initialize Git in this folder** (`Bookly/`), not your home directory. If `git rev-parse --show-toplevel` points above `Bookly/`, run `git init` here and use this path as the repo root for GitHub/GitLab/Netlify.
- **Never commit `.env`.** Only `.env.example` belongs in version control. If real keys ever appear in a commit or a paste, **rotate them** (OpenAI + Supabase) in the provider consoles.

---

## What you get in the prototype

| Requirement | How we address it |
|-------------|-------------------|
| Multi-turn conversation | Return/refund flow and order help gather details across turns |
| Tool use (real or mocked) | Server-side tools backed by **Supabase** (orders, returns, etc.) |
| Clarifying questions | Agent asks when intent or slots are missing |
| Web chat | Next.js app with a **floating chat widget** |
| Proactive support | After email inside the widget, **deterministic** context fetch → proactive or generic greeting |
| Grounded FAQ | Policy content from **repo**; public **Support** page uses the same source |
| Observability | Optional **debug** view (`?debug=1`) showing tool names, args, and results |

**Out of scope for v1:** voice input/output (typing only).

---

## Tech stack (target)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router), simple landing + chat widget |
| Backend | Next.js Route Handlers (`/api/...`) for chat and session context |
| Database | **Supabase** (PostgreSQL) — customers, orders, order items, returns |
| Policy / FAQ | JSON or Markdown in `content/policies/`; Support page reads the same files |
| LLM | OpenAI API with tool/function calling |
| Hosting | **Netlify** (connect Git repo; env vars for secrets) |

---

## Repository layout

```
Bookly/
├── README.md                 ← You are here
├── .env.example              ← Copy to .env locally; never commit real secrets
├── docs/
│   ├── README.md             ← Index of docs (AOPs, QA, design notes)
│   ├── AGENT_DESIGN.md       ← Architecture & prompt design (stub + code pointers)
│   ├── QA_TEST_PLAN.md       ← Manual test checklist
│   └── aops/                 ← Agent Operating Procedures (non-technical, human-readable)
├── content/
│   └── policies/             ← Trusted FAQ/policy source (agent + public Support page)
├── app/                      ← Next.js App Router (pages, API routes — growing here)
├── public/                   ← Static assets
├── netlify.toml              ← Netlify build + `@netlify/plugin-nextjs`
├── supabase/migrations/      ← SQL to run in Supabase (schema + seed)
├── lib/                      ← Supabase data access, policies, agent + tools
├── components/               ← Chat widget + landing sections
├── package.json
└── tsconfig.json
```

**AOPs** live under `docs/aops/` as short, contact-center-friendly procedures. Use `docs/aops/_TEMPLATE.md` when adding a new flow.

---

## Supabase setup (first time)

1. Create a Supabase project (if you haven’t already).
2. Open **SQL Editor → New query**.
3. Paste and run migrations in order: [`001_init.sql`](supabase/migrations/001_init.sql), [`002_returns_refund_status.sql`](supabase/migrations/002_returns_refund_status.sql), then [`003_refund_failed_demo.sql`](supabase/migrations/003_refund_failed_demo.sql) (adds demo order **BK-40111** with a **failed** refund for Path B testing).
4. Copy **Project URL** and keys into `.env` (see `.env.example`). The app’s API routes use the **service role** key server-side only.

### Demo customers (seeded)

| Name | Email | Scenario |
|------|-------|----------|
| Ben Carmichael | `ben@example.com` | Order **BK-10428** is **in transit** (proactive ETA). |
| Sarah Lee | `sarah@example.com` | Order **BK-20111** **delivered recently** (proactive “is this about that order?” when within 7 days of delivery). |
| Alex Kim | `alex@example.com` | Latest order **BK-30001** delivered long ago → **generic** greeting. |

**Path B refund demos (after `002` seed):** Order **BK-20111** has a return on **Piranesi** with refund **processing**. Order **BK-30001** has a return on **Project Hail Mary** with refund **completed** (`refund_processed_at` set for timeline copy).

**Guest / unknown email:** proactive order prompts are skipped; order **BK-10428** can still be looked up **by order number alone** (demo leniency).

**Dates:** **In-transit** orders are normalized on read so **estimated delivery is always the next calendar day (UTC)** and placed/shipped stay a few days in the past—unless you turn this off with `BOOKLY_DEMO_RELATIVE_ORDER_DATES=false`. It runs in **local dev** (`NODE_ENV` not production) and on **Netlify** automatically (`NETLIFY=true` is set there). Other hosts with `NODE_ENV=production` and no `NETLIFY` need `BOOKLY_DEMO_RELATIVE_ORDER_DATES=1` if you want the same behavior. Fresh seeds set **BK-10428**’s `estimated_delivery` in SQL as `timezone('utc', now())::date + 1` at insert time.

---

## Run locally

```bash
cd Bookly
npm install
cp .env.example .env   # if you don’t already have .env
# fill OPENAI_API_KEY and Supabase keys in .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add **`?debug=1`** to show tool names, arguments, and raw tool results inside the chat panel.

Production build: `npm run build` then `npm run start`.

### Demo happy path

A **happy path** is a short, repeatable script: “do these steps and you’ll see the main behaviors work.” It helps you (and anyone reviewing the repo) smoke-test without guessing what to type.

1. **Proactive in-transit:** Open chat → enter **`ben@example.com`** → after the greeting, use **Track Order** (then share **BK-10428** if prompted) or ask for status on **BK-10428** directly → confirm the reply matches tool data (use **`?debug=1`** if you want the trace).
2. **Recent delivery:** Sign in as **`sarah@example.com`** (best around the seeded April 2026 window) → confirm the “delivered recently” prompt → say it’s about that order and ask a follow-up.
3. **Return flow (Path A):** Ask to return a book → use order **BK-10428** and item **The Left Hand of Darkness** (no demo return seeded there yet) → confirm eligibility and **create_return_request** → confirm **label_url** in the tool trace.
4. **Refund status (Path B):** Ask “where’s my refund” for **BK-20111** (processing) or **BK-30001** (completed)—use **get_return_refund_status**; reply must match tool `guidance` / dates.
5. **FAQ only:** Continue as **guest** → ask shipping / password / **concierge hours** → answers should match **`/support`** and `lookup_policy` (no invented policy).
6. **Guest order lookup:** As guest → **Track Order** quick reply, then give **BK-10428** when asked (or type the order id directly) → status without email verification (demo rule).

---

## Implemented APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/session` | Email or **Continue as guest** → deterministic greeting + writes first assistant turn to `customer_history`. |
| `POST /api/chat` | User message → OpenAI **`gpt-4o`** with tools → assistant reply; each turn appended to `customer_history`. |

Trusted FAQ text lives in [`content/policies/topics.json`](content/policies/topics.json) and on the public [**/support**](/support) page.

---

## User flow (UX)

1. **Landing** — Basic Bookly marketing page.
2. **Chat widget** — Floating launcher opens the panel.
3. **First screen in widget** — Email field (maps to seeded customer in Supabase, or **guest** if unknown).
4. **Loading** — Short copy such as “Looking up your recent orders…” while context is fetched (deterministic, not LLM).
5. **First assistant message** — Proactive (in-transit / recently delivered) or generic greeting for guests.
6. **Conversation** — Order status, returns, FAQ via tools + policy lookup; debug strip optional.

---

## Deploy (Netlify)

1. Push this repo to GitHub.
2. New site from Git → same branch you use for development (e.g. `main`).
3. Build settings: use repo root, `npm run build`, and the [Netlify Next.js runtime](https://docs.netlify.com/frameworks/next-js/overview/) (see `netlify.toml`).
4. Add the same variables as `.env` under **Site configuration → Environment variables** (including `OPENAI_API_KEY` and Supabase keys).

---

## Environment variables

See `.env.example`. Secrets belong only in `.env` (local) and Netlify project settings (deploy).

---

## Documentation index

| Document | Purpose |
|----------|---------|
| [docs/AGENT_DESIGN.md](docs/AGENT_DESIGN.md) | Architecture, conversation design, example system prompt, production notes |
| [docs/aops/](docs/aops/) | Agent Operating Procedures (templates + per-flow docs) |
| [docs/QA_TEST_PLAN.md](docs/QA_TEST_PLAN.md) | Manual QA checklist (sessions, tools, Path A/B, FAQ, guardrails) |
| [content/policies/](content/policies/) | Trusted policy/FAQ content shared with the Support page |

---

## License / attribution

Assignment prototype for Bookly (fictional). Adjust as needed for your submission.
