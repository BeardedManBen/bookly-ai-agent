/** Business days from refund_processed_at until funds typically settle (card networks). */
export const BUSINESS_DAYS_CARD_AFTER_REFUND_COMPLETED = 5;

/** Conservative buffer after return is processed before refund marked complete (slow path). */
export const WORST_CASE_BUSINESS_DAYS_REFUND_COMPLETION_AFTER_RETURN = 10;

/** Conservative calendar days after refund marked complete for bank posting (worst case). */
export const WORST_CASE_CALENDAR_DAYS_BANK_AFTER_REFUND_COMPLETED = 10;

export type ReturnStatus =
  | "not_requested"
  | "label_sent"
  | "in_transit"
  | "received"
  | "inspecting"
  | "closed_approved"
  | "closed_declined";

export type RefundStatus =
  | "not_requested"
  | "requested_not_started"
  | "processing"
  | "completed"
  | "failed";

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

function addUtcCalendarDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Add n business days (Mon–Fri) starting from the calendar day of `iso` (UTC). */
export function addBusinessDaysUtcFromIso(iso: string, businessDays: number): Date {
  const d = new Date(iso);
  let added = 0;
  while (added < businessDays) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export function buildReturnRefundGuidance(input: {
  itemTitle: string;
  returnStatus: ReturnStatus;
  refundStatus: RefundStatus;
  returnProcessedDate: string | null;
  refundProcessedAt: string | null;
  labelUrl: string | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const parts: string[] = [];

  const rpd = input.returnProcessedDate
    ? formatDate(input.returnProcessedDate)
    : null;
  const rfa = input.refundProcessedAt
    ? formatDate(input.refundProcessedAt)
    : null;

  if (input.refundStatus === "failed") {
    parts.push(
      `Refund for “${input.itemTitle}” failed at the bank or payment processor after we tried to send it. The customer should confirm card details with their bank. In a full production Bookly agent, we would proactively SMS or email when this happens so they are not left waiting.`,
    );
    parts.push(
      `This chat prototype does not resend payments or escalate to a human—keep answers grounded in this status.`,
    );
    return parts.join(" ");
  }

  if (input.returnStatus === "closed_declined") {
    parts.push(
      `The return for “${input.itemTitle}” was declined after inspection. Do not promise a refund; explain they can review the returns policy or the reason noted on the return.`,
    );
    return parts.join(" ");
  }

  if (input.refundStatus === "completed" && input.refundProcessedAt) {
    const processed = new Date(input.refundProcessedAt);
    const msPerDay = 24 * 60 * 60 * 1000;
    const calendarDaysSince = Math.floor(
      (now.getTime() - processed.getTime()) / msPerDay,
    );
    const typicalFundsBy = addUtcCalendarDays(
      input.refundProcessedAt,
      BUSINESS_DAYS_CARD_AFTER_REFUND_COMPLETED,
    );
    const typicalFundsStr = typicalFundsBy.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    const worstFundsBy = addUtcCalendarDays(
      input.refundProcessedAt,
      WORST_CASE_CALENDAR_DAYS_BANK_AFTER_REFUND_COMPLETED,
    );
    const worstFundsStr = worstFundsBy.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    parts.push(
      `Refund for “${input.itemTitle}” was marked completed on ${rfa}. Funds usually reach the original payment method within about ${BUSINESS_DAYS_CARD_AFTER_REFUND_COMPLETED} business days of that date (often around ${typicalFundsStr}). As a conservative worst case for bank posting, tell the customer to allow through about ${worstFundsStr} before worrying. It has been about ${calendarDaysSince} calendar day(s) since processing—if nothing appears after the worst-case window, suggest they check with their bank.`,
    );
    return parts.join(" ");
  }

  if (input.refundStatus === "processing") {
    const anchorIso =
      input.returnProcessedDate ??
      new Date(now).toISOString();
    const worstRefundCompleteBy = addBusinessDaysUtcFromIso(
      anchorIso,
      WORST_CASE_BUSINESS_DAYS_REFUND_COMPLETION_AFTER_RETURN,
    );
    const worstRefundCompleteStr = worstRefundCompleteBy.toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      },
    );
    const worstFundsBy = addUtcCalendarDays(
      worstRefundCompleteBy.toISOString(),
      WORST_CASE_CALENDAR_DAYS_BANK_AFTER_REFUND_COMPLETED,
    );
    const worstFundsStr = worstFundsBy.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    parts.push(
      `Refund for “${input.itemTitle}” is processing.${rpd ? ` The return was processed on ${rpd}.` : ""} Typical timing: a few business days for our team to finish processing, then a few more for the bank.`,
    );
    parts.push(
      `Conservative worst-case framing for the customer: if everything runs slow, the refund might not be marked complete until around ${worstRefundCompleteStr}, and funds might not appear in their account until around ${worstFundsStr}. Use these as upper bounds, not promises.`,
    );
    return parts.join(" ");
  }

  if (
    input.returnStatus === "label_sent" &&
    input.refundStatus === "requested_not_started"
  ) {
    parts.push(
      `Return for “${input.itemTitle}” is open: the customer should ship the item using the prepaid label.${input.labelUrl ? ` Label link: ${input.labelUrl}` : ""} Refund starts after we receive and approve the return.`,
    );
    return parts.join(" ");
  }

  if (input.returnStatus === "in_transit") {
    parts.push(
      `Return shipment for “${input.itemTitle}” is in transit to our warehouse. After receipt and inspection, we’ll update refund status.`,
    );
    return parts.join(" ");
  }

  if (
    input.returnStatus === "received" ||
    input.returnStatus === "inspecting"
  ) {
    parts.push(
      `Return for “${input.itemTitle}” is at the warehouse${input.returnStatus === "inspecting" ? " (inspecting)" : ""}.${rpd ? ` Processed for inspection around ${rpd}.` : ""} Refund moves to processing once approved.`,
    );
    return parts.join(" ");
  }

  if (
    input.returnStatus === "closed_approved" &&
    input.refundStatus !== "completed"
  ) {
    parts.push(
      `Return for “${input.itemTitle}” was approved.${rpd ? ` Return processed on ${rpd}.` : ""} Refund should move to processing or completed shortly—use the exact refund_status from the tool.`,
    );
    return parts.join(" ");
  }

  parts.push(
    `Return for “${input.itemTitle}” is at stage ${input.returnStatus}; refund status is ${input.refundStatus}. Summarize next steps from these values only.`,
  );
  return parts.join(" ");
}
