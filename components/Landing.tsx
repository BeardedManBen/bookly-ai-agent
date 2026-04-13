import Image from "next/image";
import Link from "next/link";
import { ChatWidget } from "@/components/ChatWidget";

export function Landing({ debug }: { debug: boolean }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-teal-50 via-white to-sky-50 text-slate-800">
      <header className="border-b border-teal-100/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/bookly-logo.png"
              alt="Bookly"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain drop-shadow-sm"
              priority
            />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                Bookly
              </span>
              <span className="text-sm text-slate-600">
                Independent bookstore
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              className="font-medium text-teal-800 hover:text-teal-950 underline-offset-4 hover:underline"
              href="/support"
            >
              Support &amp; policies
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="max-w-2xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
            Fiction · Nonfiction · Children
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900">
            Stories delivered to your door.
          </h1>
          <p className="text-lg leading-relaxed text-slate-600">
            Bookly is a fictional online bookstore built for a support-agent
            prototype. Browse slowly, read widely, and if anything goes wrong
            with an order, Cam can help.
          </p>
          <div className="rounded-2xl border border-teal-100 bg-white/90 p-6 shadow-sm shadow-teal-900/5 ring-1 ring-teal-50">
            <p className="text-sm font-semibold text-slate-900">
              Try the concierge
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Open the chat widget to try proactive greetings, order lookup,
              returns, and policy answers.
            </p>
          </div>
        </div>
      </main>

      <ChatWidget debug={debug} />
    </div>
  );
}
