import {
  normalizeOrderRowForDemo,
  normalizeOrderRowsForDemo,
} from "@/lib/demo/order-dates";
import { getServiceSupabase } from "@/lib/supabase/admin";

export type OrderRow = {
  id: string;
  public_id: string;
  customer_id: string;
  status: string;
  placed_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery: string | null;
  tracking_number: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  title: string;
  price_cents: number;
  return_eligible_until: string;
};

export async function getLatestOrderForCustomer(
  customerId: string,
): Promise<OrderRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, public_id, customer_id, status, placed_at, shipped_at, delivered_at, estimated_delivery, tracking_number",
    )
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeOrderRowForDemo(data) : null;
}

export async function listOrdersForCustomerId(
  customerId: string,
): Promise<OrderRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, public_id, customer_id, status, placed_at, shipped_at, delivered_at, estimated_delivery, tracking_number",
    )
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false });

  if (error) throw error;
  return normalizeOrderRowsForDemo(data ?? []);
}

export async function getOrderByPublicId(
  publicId: string,
): Promise<OrderRow | null> {
  const supabase = getServiceSupabase();
  const normalized = publicId.trim().toUpperCase();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, public_id, customer_id, status, placed_at, shipped_at, delivered_at, estimated_delivery, tracking_number",
    )
    .ilike("public_id", normalized)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeOrderRowForDemo(data) : null;
}

export async function getOrderItems(orderId: string): Promise<OrderItemRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("order_items")
    .select("id, order_id, title, price_cents, return_eligible_until")
    .eq("order_id", orderId)
    .order("title", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getOrderItemByOrderAndTitle(
  orderId: string,
  itemTitle: string,
): Promise<OrderItemRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("order_items")
    .select("id, order_id, title, price_cents, return_eligible_until")
    .eq("order_id", orderId)
    .ilike("title", `%${itemTitle.trim()}%`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
