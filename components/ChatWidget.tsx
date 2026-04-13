"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { SessionContextResponse } from "@/lib/types";
import type { ToolDebugEvent } from "@/lib/types";

type ChatLine = { role: "user" | "assistant"; content: string };

const QUICK_REPLIES: { label: string; message: string }[] = [
  { label: "Track Order", message: "I'd like to track my order." },
  { label: "Start a return", message: "I'd like to return a book from my order." },
  {
    label: "Refund status",
    message: "I'd like to check the status of a refund on my return.",
  },
  { label: "Shipping times", message: "How long does standard shipping take?" },
  { label: "Password help", message: "I forgot my password — how do I reset it?" },
  { label: "Concierge hours", message: "When is chat support available?" },
];

export function ChatWidget({ debug }: { debug: boolean }) {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"email" | "loading" | "chat">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [ctx, setCtx] = useState<SessionContextResponse | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [toolTrace, setToolTrace] = useState<ToolDebugEvent[]>([]);
  const [guestMode, setGuestMode] = useState(false);
  const [closeOverlay, setCloseOverlay] = useState<"none" | "csat">("none");
  const [csatResolved, setCsatResolved] = useState<boolean | null>(null);
  const [csatRating, setCsatRating] = useState<number | null>(null);
  const [csatSending, setCsatSending] = useState(false);

  const resetAndClose = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setPhase("email");
    setCtx(null);
    setMessages([]);
    setDraft("");
    setToolTrace([]);
    setError(null);
    setGuestMode(false);
    setEmail("");
    setCloseOverlay("none");
    setCsatResolved(null);
    setCsatRating(null);
    setOpen(false);
  }, []);

  const requestClose = useCallback(() => {
    if (phase === "chat" && messages.length >= 2) {
      setCloseOverlay("csat");
      return;
    }
    resetAndClose();
  }, [phase, messages.length, resetAndClose]);

  const skipCsat = useCallback(() => {
    resetAndClose();
  }, [resetAndClose]);

  const submitCsat = useCallback(async () => {
    setCsatSending(true);
    setError(null);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          customerId: ctx?.customerId ?? null,
          email: ctx?.email ?? null,
          resolved: csatResolved,
          rating: csatRating,
        }),
      });
    } catch {
      /* still end chat */
    } finally {
      setCsatSending(false);
      resetAndClose();
    }
  }, [sessionId, ctx, csatResolved, csatRating, resetAndClose]);

  const startSession = useCallback(
    async (input: { isGuest: boolean; email?: string }) => {
      setError(null);
      setGuestMode(input.isGuest);
      setPhase("loading");
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
            isGuest: input.isGuest,
            email: input.isGuest ? undefined : input.email,
          }),
        });
        const data = (await res.json()) as
          | SessionContextResponse
          | { error?: string };

        if (!res.ok) {
          throw new Error("error" in data ? String(data.error) : "Session failed");
        }

        const ok = data as SessionContextResponse;
        setCtx(ok);
        setMessages([{ role: "assistant", content: ok.greeting }]);
        setPhase("chat");
      } catch (e) {
        setPhase("email");
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    },
    [sessionId],
  );

  const submitChat = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || !ctx) return;

      setSending(true);
      setError(null);
      setMessages((m) => [...m, { role: "user", content: text }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
            customerId: ctx.customerId,
            email: ctx.email,
            firstName: ctx.firstName,
            userMessage: text,
            debug,
          }),
        });
        const data = (await res.json()) as
          | { reply: string; toolEvents?: ToolDebugEvent[] }
          | { error?: string };

        if (!res.ok) {
          throw new Error("error" in data ? String(data.error) : "Chat failed");
        }

        const reply = "reply" in data ? data.reply : "";
        setMessages((m) => [...m, { role: "assistant", content: reply }]);

        if (debug && data && "toolEvents" in data && data.toolEvents?.length) {
          setToolTrace((t) => [...t, ...data.toolEvents!]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "I couldn’t send that message. Check your connection and try again.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [ctx, debug, sessionId],
  );

  const sendUserMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await submitChat(text);
  }, [draft, submitChat]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-gradient-to-r from-teal-600 to-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/25 transition hover:from-teal-700 hover:to-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Chat with Cam
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/35 p-4 backdrop-blur-[2px] sm:items-center sm:justify-end"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) requestClose();
          }}
        >
          <div
            className="flex h-[min(640px,calc(100vh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-teal-900/15 ring-1 ring-teal-100"
            role="dialog"
            aria-label="Bookly support chat"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <Image
                  src="/cam-the-concierge.png"
                  alt="Cam, The Concierge"
                  width={44}
                  height={44}
                  className="mt-0.5 h-11 w-11 shrink-0 object-contain"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                    Bookly
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    Cam, The Concierge
                  </p>
                  <p className="text-xs text-slate-600">Customer support</p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-teal-100/80"
                aria-label="Close chat"
              >
                Close
              </button>
            </header>

            {phase === "email" ? (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gradient-to-b from-white to-teal-50/30 p-4">
                <p className="text-sm text-slate-600">
                  Sign in with the email you used at checkout, or continue as a
                  guest.
                </p>
                <label className="text-xs font-medium text-slate-700">
                  Email
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-teal-500/0 transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="you@example.com"
                  />
                </label>
                {error ? (
                  <p className="text-sm text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => startSession({ isGuest: false, email })}
                  className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
                >
                  Continue with email
                </button>
                <button
                  type="button"
                  onClick={() => startSession({ isGuest: true })}
                  className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-teal-50"
                >
                  Continue as guest
                </button>
              </div>
            ) : null}

            {phase === "loading" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-gradient-to-b from-white to-teal-50/40 p-6 text-center">
                <p className="text-sm font-medium text-slate-900">
                  {guestMode
                    ? "Starting your chat…"
                    : "Looking up your recent orders…"}
                </p>
                <p className="text-xs text-slate-600">
                  This usually takes just a moment.
                </p>
              </div>
            ) : null}

            {phase === "chat" ? (
              <div className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-white to-teal-50/20">
                {closeOverlay === "csat" ? (
                  <div className="absolute inset-0 z-10 flex flex-col justify-center gap-4 bg-white/95 p-5 text-center shadow-inner">
                    <p className="text-sm font-semibold text-slate-900">
                      Before you go
                    </p>
                    <p className="text-xs text-slate-600">
                      Was your question resolved?
                    </p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCsatResolved(true)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          csatResolved === true
                            ? "bg-teal-700 text-white"
                            : "border border-teal-200 bg-teal-50 text-teal-900"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setCsatResolved(false)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          csatResolved === false
                            ? "bg-teal-700 text-white"
                            : "border border-teal-200 bg-teal-50 text-teal-900"
                        }`}
                      >
                        No
                      </button>
                    </div>
                    <p className="text-xs text-slate-600">Rate this chat</p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} stars`}
                          onClick={() => setCsatRating(n)}
                          className={`text-lg leading-none ${
                            csatRating !== null && n <= csatRating
                              ? "text-amber-500"
                              : "text-slate-300"
                          }`}
                        >
                          {"\u2605"}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        type="button"
                        disabled={csatSending}
                        onClick={() => void submitCsat()}
                        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-40"
                      >
                        {csatSending ? "Sending…" : "Submit and end chat"}
                      </button>
                      <button
                        type="button"
                        disabled={csatSending}
                        onClick={skipCsat}
                        className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-teal-50 disabled:opacity-40"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m, idx) => (
                    <div
                      key={`${idx}-${m.role}`}
                      className={
                        m.role === "user"
                          ? "ml-8 rounded-2xl bg-gradient-to-br from-slate-800 to-teal-900 px-3 py-2 text-sm text-white shadow-sm"
                          : "mr-8 rounded-2xl border border-teal-100 bg-white/95 px-3 py-2 text-sm text-slate-800 shadow-sm"
                      }
                    >
                      {m.content}
                    </div>
                  ))}
                </div>

                {debug ? (
                  <div className="max-h-40 overflow-y-auto border-t border-teal-100 bg-teal-50/50 px-3 py-2 text-[11px] leading-snug text-slate-800">
                    <p className="font-semibold text-teal-900">Debug: tools</p>
                    <p className="mt-1 text-slate-700">
                      This panel lists tool calls and results Cam used to ground
                      answers. The Chat Completions API does not expose hidden
                      chain-of-thought—nothing extra appears in DevTools.
                    </p>
                    {toolTrace.length ? (
                      <pre className="mt-1 whitespace-pre-wrap break-words">
                        {JSON.stringify(toolTrace, null, 2)}
                      </pre>
                    ) : (
                      <p className="mt-1 italic text-slate-600">
                        No tools used yet in this session.
                      </p>
                    )}
                  </div>
                ) : null}

                {error ? (
                  <p className="px-4 text-xs text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}

                <div
                  className="flex flex-wrap gap-2 border-t border-teal-100 bg-white/90 px-3 pt-3"
                  role="group"
                  aria-label="Quick replies"
                >
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      disabled={sending || closeOverlay === "csat"}
                      onClick={() => void submitChat(q.message)}
                      className="rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1.5 text-xs font-medium text-teal-900 shadow-sm hover:bg-teal-100 disabled:opacity-40"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 bg-white/90 px-3 pb-3 pt-1">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendUserMessage();
                      }
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-teal-500/0 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Message Cam…"
                    disabled={sending || closeOverlay === "csat"}
                  />
                  <button
                    type="button"
                    onClick={() => void sendUserMessage()}
                    disabled={
                      sending || !draft.trim() || closeOverlay === "csat"
                    }
                    className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
