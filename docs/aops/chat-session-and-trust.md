# AOP: Chat session, sign-in, and trust

**Related:** `/api/session`, `/api/feedback`, chat widget (close flow), `?debug=1`

---

## Purpose

Set expectations for **how a chat starts**, what happens when **email is not found**, how we **end a chat** without leaving the old conversation stuck to the widget, and how we stay **honest** (no fake “reasoning,” no policy hallucinations).

---

## Starting the chat

- **Continue with email:** We look up the customer. If we find them, Cam may open with a **short** proactive note about their latest order (for example that an order is on the way) without dumping tracking numbers or long ETAs in the first line unless the customer asks.
- **Continue as guest:** No account lookup. Cam helps with **order number** (and can use **email** only if the customer gives an address that exists in Bookly—see order-tracking AOP).
- **Email not in our database:** We **tell them plainly** we could not find an account for that address. We invite them to **try the email again** (in case of a typo) or **continue as a guest** and use order numbers when needed. We do not pretend they are signed in.

---

## Closing the chat (new session)

- When the customer **closes** the chat (or taps outside the window), we treat that as **ending the session**: the next time they open chat they should **not** see the old thread unless we intentionally add “resume” later.
- After a real conversation (more than a greeting), we ask a **quick satisfaction check** before the panel closes: whether their issue felt **resolved** (yes/no) and a **1–5 star** rating. They can **skip** if they prefer. Answers are stored for product learning, not shown back to the model in the same session.

---

## Escalation (“supervisor”) and empathy

- We **do not** transfer to a live supervisor in this prototype.
- We **do** acknowledge frustration, explain what Cam **can** still do (tracking, returns, refund status, policies), and offer **concrete options**—for example answering another Bookly question or **closing chat** and coming back later.

---

## Debug mode (`?debug=1`)

- The debug strip shows **tool calls and tool results** Cam used to ground answers (what was looked up in the database or policy file).
- It does **not** show hidden “chain-of-thought.” The OpenAI Chat API does not expose that, and opening browser DevTools does not reveal it either.

---

## What we never do

- Invent shipping options, refund dates, or policy rules that are not in **tools** or **`lookup_policy`** output.
- Answer **off-topic** questions (news, politics, medical, etc.) as if we were a general assistant; we **decline kindly** and steer back to Bookly.
