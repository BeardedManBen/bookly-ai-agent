/**
 * Post-MVP: send SMS when a refund is marked completed (e.g. Twilio).
 * Wire this from your order/returns worker or webhook — not from chat creation.
 */
export function notifyRefundProcessedPlaceholder(input: {
  returnId: string;
  orderPublicId: string;
  customerHint?: string | null;
}): void {
  if (process.env.NODE_ENV === "development") {
    console.info(
      "[bookly:sms-placeholder] would notify customer refund processed",
      input,
    );
  }
}
