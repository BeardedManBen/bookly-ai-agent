# Content

**Trusted copy** that the agent and the public site both use—so answers in chat match what customers can read on the Support page.

| Path | Role |
|------|------|
| `policies/` | FAQ and policy topics (JSON and/or Markdown). The Support route and `lookup_policy` (or equivalent) read from here. |

Do not duplicate policy text in the database for the prototype; keep a **single source of truth** in this folder.
