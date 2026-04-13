# Agent Design Document — Cam, The Concierge (Bookly)

> **Status:** Stub for narrative write-up. The running system is in the repo; use the pointers below and [`aops/`](aops/README.md) for operational detail.

## Where the implementation lives

| Area | Location |
|------|----------|
| System prompt | `lib/agent/systemPrompt.ts` |
| Tool schemas | `lib/agent/toolDefinitions.ts` |
| Tool execution (Supabase + policy) | `lib/agent/toolExecutor.ts` |
| Chat completion loop | `lib/agent/runAgent.ts` |
| Session + proactive greeting | `app/api/session/route.ts`, `lib/greeting.ts` |
| Demo date shifting (in-transit ETA) | `lib/demo/order-dates.ts` |
| Policies / FAQ source | `content/policies/topics.json` |

## 1. Architecture overview

- **Components:** (agent loop, tools, memory, prompts, data stores)
- **Data flow:** (request → context → model → tools → response)
- **Where policy lives vs transactional data**

*To be completed.*

## 2. Conversation and decision design

- **Intent handling:** (how the agent recognizes order vs return vs FAQ)
- **When to answer vs ask vs call tools vs decline**

*To be completed.*

## 3. Example system prompt(s)

- Paste a representative system prompt here, or link to `docs/prompts.md` if it runs long.

*To be completed.*

## 4. Hallucination and safety controls

- **Grounding rules** (tools + policy only)
- **Fallback language**

*To be completed.*

## 5. Production readiness

- **Tradeoffs** made for the prototype
- **What would change** for production (auth, monitoring, evals, etc.)

*To be completed.*
