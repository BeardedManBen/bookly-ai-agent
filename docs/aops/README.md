# Agent Operating Procedures (AOPs)

**AOPs** describe how Cam handles specific support tasks in language that **contact center and operations** folks can read without code.

- Add one file per major flow (e.g. order tracking, return request).
- Start from [`_TEMPLATE.md`](_TEMPLATE.md).
- Current drafts: [`chat-session-and-trust.md`](chat-session-and-trust.md), [`order-tracking.md`](order-tracking.md), [`returns-and-refunds.md`](returns-and-refunds.md), [`faq-and-policies.md`](faq-and-policies.md).
- Keep steps short: **trigger → information needed → actions → what we say if something is missing.**

The implementation (tools, API routes) should mirror these procedures so product and engineering stay aligned.
