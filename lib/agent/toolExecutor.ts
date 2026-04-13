import { lookupPolicyTopic } from "@/lib/policies/lookup";
import { findCustomerByEmail } from "@/lib/data/customers";
import {
  getOrderByPublicId,
  getOrderItemByOrderAndTitle,
  getOrderItems,
  listOrdersForCustomerId,
} from "@/lib/data/orders";
import {
  createReturnRecord,
  listReturnsForOrderPublicId,
} from "@/lib/data/returns";
import {
  buildReturnRefundGuidance,
  type RefundStatus,
  type ReturnStatus,
} from "@/lib/refund-timeline";
import type { ToolDebugEvent } from "@/lib/types";

function todayUtcDateString(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function executeToolCall(input: {
  name: string;
  arguments: unknown;
}): Promise<{ result: unknown; debug: ToolDebugEvent }> {
  const args =
    typeof input.arguments === "string"
      ? (JSON.parse(input.arguments) as Record<string, unknown>)
      : ((input.arguments ?? {}) as Record<string, unknown>);

  if (input.name === "get_order_status") {
    const orderPublicId = String(args.order_public_id ?? "").trim();
    if (!orderPublicId) {
      const result = { ok: false, error: "order_public_id is required" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const order = await getOrderByPublicId(orderPublicId);
    if (!order) {
      const result = { ok: false, error: "Order not found" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const result = {
      ok: true,
      order: {
        public_id: order.public_id,
        status: order.status,
        placed_at: order.placed_at,
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at,
        estimated_delivery: order.estimated_delivery,
        tracking_number: order.tracking_number,
      },
    };
    return {
      result,
      debug: { name: input.name, arguments: args, result },
    };
  }

  if (input.name === "list_orders_for_email") {
    const raw = String(args.email ?? "").trim().toLowerCase();
    if (!raw || !raw.includes("@")) {
      const result = { ok: false, error: "A valid email is required" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const customer = await findCustomerByEmail(raw);
    if (!customer) {
      const result = {
        ok: false,
        error: "No Bookly account found for that email.",
        hint:
          "Tell the customer the email may be wrong or use a different address at checkout; offer to continue with order number or try their email again.",
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const orders = await listOrdersForCustomerId(customer.id);
    const inTransit = orders.filter((o) => o.status === "in_transit");
    const result = {
      ok: true,
      email: customer.email,
      customer_first_name: customer.first_name,
      order_count: orders.length,
      in_transit_public_ids: inTransit.map((o) => o.public_id),
      orders: orders.map((o) => ({
        public_id: o.public_id,
        status: o.status,
        placed_at: o.placed_at,
        shipped_at: o.shipped_at,
        delivered_at: o.delivered_at,
        estimated_delivery: o.estimated_delivery,
        tracking_number: o.tracking_number,
      })),
      note:
        "Proactively mention in_transit orders first. For tracking details on one order, call get_order_status with that public_id.",
    };
    return {
      result,
      debug: { name: input.name, arguments: args, result },
    };
  }

  if (input.name === "get_order_items") {
    const orderPublicId = String(args.order_public_id ?? "").trim();
    if (!orderPublicId) {
      const result = { ok: false, error: "order_public_id is required" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const order = await getOrderByPublicId(orderPublicId);
    if (!order) {
      const result = { ok: false, error: "Order not found" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const items = await getOrderItems(order.id);
    const result = {
      ok: true,
      order_public_id: order.public_id,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        price_cents: i.price_cents,
        return_eligible_until: i.return_eligible_until,
      })),
    };
    return {
      result,
      debug: { name: input.name, arguments: args, result },
    };
  }

  if (input.name === "get_return_refund_status") {
    const orderPublicId = String(args.order_public_id ?? "").trim();
    const itemTitle =
      args.item_title === undefined || args.item_title === null
        ? ""
        : String(args.item_title).trim();

    if (!orderPublicId) {
      const result = { ok: false, error: "order_public_id is required" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const order = await getOrderByPublicId(orderPublicId);
    if (!order) {
      const result = { ok: false, error: "Order not found" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const allRows = await listReturnsForOrderPublicId(orderPublicId);
    if (allRows.length === 0) {
      const result = {
        ok: true,
        order_public_id: order.public_id,
        returns: [],
        message:
          "No returns are on file for this order yet. If they want a refund, they usually start by opening a return: confirm which item and order, check eligibility, then create_return_request. If they only want policy wording, use lookup_policy topic returns.",
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const rows = itemTitle
      ? allRows.filter((r) =>
          r.item_title.toLowerCase().includes(itemTitle.toLowerCase()),
        )
      : allRows;

    if (rows.length === 0) {
      const result = {
        ok: true,
        order_public_id: order.public_id,
        returns: [],
        known_items_with_returns: allRows.map((r) => r.item_title),
        message:
          "No return matched that item description. Ask which book they returned or pick from the known items listed.",
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const returns = rows.map((r) => ({
      return_id: r.id,
      item_title: r.item_title,
      return_status: r.return_status,
      refund_status: r.refund_status,
      return_processed_date: r.return_processed_date,
      refund_processed_at: r.refund_processed_at,
      label_url: r.label_url,
      guidance: buildReturnRefundGuidance({
        itemTitle: r.item_title,
        returnStatus: r.return_status as ReturnStatus,
        refundStatus: r.refund_status as RefundStatus,
        returnProcessedDate: r.return_processed_date,
        refundProcessedAt: r.refund_processed_at,
        labelUrl: r.label_url,
      }),
    }));

    const result = {
      ok: true,
      order_public_id: order.public_id,
      returns,
 };
    return {
      result,
      debug: { name: input.name, arguments: args, result },
    };
  }

  if (input.name === "check_return_eligibility") {
    const orderPublicId = String(args.order_public_id ?? "").trim();
    const itemTitle = String(args.item_title ?? "").trim();
    if (!orderPublicId || !itemTitle) {
      const result = {
        ok: false,
        error: "order_public_id and item_title are required",
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const order = await getOrderByPublicId(orderPublicId);
    if (!order) {
      const result = { ok: false, error: "Order not found" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const item = await getOrderItemByOrderAndTitle(order.id, itemTitle);
    if (!item) {
      const result = {
        ok: true,
        eligible: false,
        reason:
          "No matching item title was found on this order. Ask the customer which item they mean.",
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const today = todayUtcDateString();
    const eligible = item.return_eligible_until >= today;
    const result = {
      ok: true,
      eligible,
      order_item_id: item.id,
      title: item.title,
      return_eligible_until: item.return_eligible_until,
      reason: eligible
        ? "Item is within the return window."
        : `Return window ended on ${item.return_eligible_until}.`,
    };
    return {
      result,
      debug: { name: input.name, arguments: args, result },
    };
  }

  if (input.name === "create_return_request") {
    const orderPublicId = String(args.order_public_id ?? "").trim();
    const itemTitle = String(args.item_title ?? "").trim();
    const reason =
      args.reason === undefined || args.reason === null
        ? null
        : String(args.reason);

    if (!orderPublicId || !itemTitle) {
      const result = {
        ok: false,
        error: "order_public_id and item_title are required",
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const order = await getOrderByPublicId(orderPublicId);
    if (!order) {
      const result = { ok: false, error: "Order not found" };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const item = await getOrderItemByOrderAndTitle(order.id, itemTitle);
    if (!item) {
      const result = {
        ok: false,
        error: "Item not found on order; do not create a return.",
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const today = todayUtcDateString();
    if (item.return_eligible_until < today) {
      const result = {
        ok: false,
        error: `Not eligible: return window ended on ${item.return_eligible_until}.`,
      };
      return {
        result,
        debug: { name: input.name, arguments: args, result },
      };
    }

    const created = await createReturnRecord({
      orderItemId: item.id,
      reason,
    });

    const result = {
      ok: true,
      return_id: created.id,
      order_public_id: order.public_id,
      item_title: item.title,
      return_status: created.return_status,
      refund_status: created.refund_status,
      label_url: created.label_url,
      message:
        "Return opened. Share the prepaid label URL with the customer, explain they should pack the book securely, and that the refund is issued after we receive and inspect the return per policy. lookup_policy topic returns can reinforce timelines.",
    };
    return {
      result,
      debug: { name: input.name, arguments: args, result },
    };
  }

  if (input.name === "lookup_policy") {
    const topic = String(args.topic ?? "").trim();
    const hit = lookupPolicyTopic(topic);
    const result = hit.found
      ? { ok: true, topic_id: hit.topic!.id, title: hit.topic!.title, body: hit.topic!.body }
      : { ok: false, hint: hit.hint ?? "No policy match." };
    return {
      result,
      debug: { name: input.name, arguments: args, result },
    };
  }

  const result = { ok: false, error: `Unknown tool: ${input.name}` };
  return {
    result,
    debug: { name: input.name, arguments: args, result },
  };
}
