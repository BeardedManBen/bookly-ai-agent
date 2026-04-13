import Image from "next/image";
import Link from "next/link";
import { ChatWidget } from "@/components/ChatWidget";
import { listPolicyTopics } from "@/lib/policies/lookup";

export const metadata = {
  title: "Support & policies · Bookly",
  description: "Trusted FAQ content used by Cam and the Bookly support experience.",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const debugRaw = sp.debug;
  const debug =
    debugRaw === "1" ||
    debugRaw === "true" ||
    (Array.isArray(debugRaw) && debugRaw.includes("1"));

  const topics = listPolicyTopics();

  return (
    <div className="min-h-full bg-gradient-to-b from-teal-50 via-white to-sky-50 text-slate-800">
      <header className="border-b border-teal-100/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-teal-950"
          >
            <Image
              src="/bookly-logo.png"
              alt="Bookly"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span>Back to Bookly</span>
          </Link>
          <span className="text-xs text-slate-500">Source: content/policies</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Support &amp; policies
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            This page is the human-readable companion to the same policy snippets
            Cam can retrieve with the{" "}
            <code className="rounded border border-teal-100 bg-teal-50 px-1.5 py-0.5 text-xs text-teal-900">
              lookup_policy
            </code>{" "}
            tool. If it isn’t written here, Cam should not invent it.
          </p>
        </div>

        <div className="space-y-8">
          {topics.map((t) => (
            <section
              key={t.id}
              id={t.id}
              className="scroll-mt-24 rounded-2xl border border-teal-100 bg-white/90 p-6 shadow-sm shadow-teal-900/5 ring-1 ring-teal-50"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Topic id: {t.id}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {t.title}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {t.body}
              </p>
            </section>
          ))}
        </div>
      </main>

      <ChatWidget debug={debug} />
    </div>
  );
}
