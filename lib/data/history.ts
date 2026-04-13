import { getServiceSupabase } from "@/lib/supabase/admin";

export async function insertHistoryMessage(input: {
  sessionId: string;
  customerId: string | null;
  email: string | null;
  role: "user" | "assistant";
  content: string;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("customer_history").insert({
    session_id: input.sessionId,
    customer_id: input.customerId,
    email: input.email,
    role: input.role,
    content: input.content,
    meta: input.meta ?? null,
  });

  if (error) throw error;
}

export type HistoryRow = {
  role: "user" | "assistant";
  content: string;
};

export async function listHistoryForSession(
  sessionId: string,
): Promise<HistoryRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("customer_history")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content as string,
  }));
}
