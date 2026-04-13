import { getServiceSupabase } from "@/lib/supabase/admin";

export type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export async function findCustomerByEmail(
  email: string,
): Promise<CustomerRow | null> {
  const supabase = getServiceSupabase();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email")
    .eq("email", normalized)
    .maybeSingle();

  if (error) throw error;
  return data;
}
