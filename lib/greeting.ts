import type { CustomerRow } from "@/lib/data/customers";
import type { OrderRow } from "@/lib/data/orders";
import type { GreetingKind, SessionContextResponse } from "@/lib/types";

export type GreetingResult = {
  kind: GreetingKind;
  text: string;
  orderPublicId?: string;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildProactiveGreeting(input: {
  customer: CustomerRow;
  latestOrder: OrderRow | null;
}): GreetingResult {
  const first = input.customer.first_name;
  const order = input.latestOrder;

  if (!order) {
    return {
      kind: "generic",
      text: `Hi ${first} — how can I help today?`,
    };
  }

  const publicId = order.public_id;
  const eta = formatDate(order.estimated_delivery);

  if (order.status === "in_transit") {
    return {
      kind: "in_transit",
      text: `Hi ${first} — we can see order ${publicId} is on the way. Are you looking for an ETA?`,
      orderPublicId: publicId,
    };
  }

  if (order.status === "delivered" && order.delivered_at) {
    const delivered = formatDate(order.delivered_at);
    return {
      kind: "delivered_recent",
      text: `Hi ${first} — your latest order ${publicId} shows delivered${delivered ? ` on ${delivered}` : ""}. Are you contacting us about that order, or something else?`,
      orderPublicId: publicId,
    };
  }

  return {
    kind: "generic",
    text: `Hi ${first} — how can I help with order ${publicId} or anything else today?`,
    orderPublicId: publicId,
  };
}

export function buildUnknownEmailGreeting(email: string): GreetingResult {
  return {
    kind: "unknown_email",
    text: `We could not find an account for ${email}. If that was a typo, you can try your email again. Otherwise, you can continue as a guest and we will look things up by order number when needed.`,
  };
}

function daysSinceDelivery(deliveredAt: string | null): number | null {
  if (!deliveredAt) return null;
  const d = new Date(deliveredAt);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function buildSessionContext(input: {
  sessionId: string;
  customer: CustomerRow | null;
  isGuest: boolean;
  submittedEmail: string | null;
  latestOrder: OrderRow | null;
}): SessionContextResponse {
  if (input.isGuest) {
    return {
      sessionId: input.sessionId,
      customerId: null,
      email: null,
      firstName: null,
      greetingKind: "generic",
      greeting:
        "Hi — how can I help today? You can share an order number whenever you’re ready.",
    };
  }

  if (!input.customer && input.submittedEmail) {
    const g = buildUnknownEmailGreeting(input.submittedEmail);
    return {
      sessionId: input.sessionId,
      customerId: null,
      email: input.submittedEmail,
      firstName: null,
      greetingKind: g.kind,
      greeting: g.text,
    };
  }

  if (!input.customer) {
    return {
      sessionId: input.sessionId,
      customerId: null,
      email: null,
      firstName: null,
      greetingKind: "generic",
      greeting: "Hi — how can I help today?",
    };
  }

  const g = buildProactiveGreeting({
    customer: input.customer,
    latestOrder: input.latestOrder,
  });

  const order = input.latestOrder;
  return {
    sessionId: input.sessionId,
    customerId: input.customer.id,
    email: input.customer.email,
    firstName: input.customer.first_name,
    greetingKind: g.kind,
    greeting: g.text,
    ...(order
      ? {
          latestOrder: {
            publicId: order.public_id,
            status: order.status,
            estimatedDelivery: order.estimated_delivery,
            deliveredAt: order.delivered_at,
            trackingNumber: order.tracking_number,
            daysSinceDelivery: daysSinceDelivery(order.delivered_at),
          },
        }
      : {}),
  };
}
