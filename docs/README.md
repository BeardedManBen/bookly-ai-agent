# Documentation

| Resource | What it is |
|----------|------------|
| [`AGENT_DESIGN.md`](AGENT_DESIGN.md) | Agent design narrative (architecture, decisions, grounding, production tradeoffs) + pointers to code. |
| [`QA_TEST_PLAN.md`](QA_TEST_PLAN.md) | Manual QA checklist for the prototype. |
| [`aops/`](aops/README.md) | **Agent Operating Procedures** — plain-language runbooks (order tracking, returns, FAQ, chat session). |

Implementation touchpoints for the agent:

- `lib/agent/systemPrompt.ts` — system prompt
- `lib/agent/toolDefinitions.ts` / `toolExecutor.ts` — tools
- `lib/agent/runAgent.ts` — model + tool loop
- `content/policies/topics.json` — FAQ source of truth (also `/support`)
