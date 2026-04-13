import { randomUUID } from "crypto";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getOrderByPublicId, getOrderItems } from "@/lib/data/orders";

export type ReturnRow = {
  id: string;
  order_item_id: string;
  return_status: string;
  refund_status: string;
  return_processed_date: string | null;
  refund_processed_at: string | null;
  label_url: string | null;
  reason: string | null;
  created_at: string;
};

export type ReturnWithItemTitle = ReturnRow & { item_title: string };

export async function listReturnsForOrderPublicId(
  orderPublicId: string,
): Promise<ReturnWithItemTitle[]> {
  const order = await getOrderByPublicId(orderPublicId);
  if (!order) return [];

  const items = await getOrderItems(order.id);
  if (!items.length) return [];

  const itemIds = items.map((i) => i.id);
  const titleByItem = new Map(items.map((i) => [i.id, i.title]));

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("returns")
    .select(
      "id, order_item_id, return_status, refund_status, return_processed_date, refund_processed_at, label_url, reason, created_at",
    )
    .in("order_item_id", itemIds);

  if (error) throw error;

  return (data ?? []).map((r) => ({
    ...(r as ReturnRow),
    item_title: titleByItem.get(r.order_item_id as string) ?? "",
  }));
}

export async function createReturnRecord(input: {
  orderItemId: string;
  reason: string | null;
}): Promise<{
  id: string;
  label_url: string;
  return_status: string;
  refund_status: string;
}> {
  const supabase = getServiceSupabase();
  const slug = randomUUID().replace(/-/g, "").slice(0, 12);
  const labelUrl = `https://labels.bookly.example/r/${slug}`;

  const { data, error } = await supabase
    .from("returns")
    .insert({
      order_item_id: input.orderItemId,
      reason: input.reason,
      return_status: "label_sent",
      refund_status: "requested_not_started",
      label_url: labelUrl,
    })
    .select("id, label_url, return_status, refund_status")
    .single();

  if (error) throw error;
  return {
    id: data.id as string,
    label_url: data.label_url as string,
    return_status: data.return_status as string,
    refund_status: data.refund_status as string,
  };
}
