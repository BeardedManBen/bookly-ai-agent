import { Landing } from "@/components/Landing";

export default async function Home({
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

  return <Landing debug={debug} />;
}
