import type { OrderRow } from "@/lib/data/orders";

/** When true, in-transit orders get dates shifted so ETA is always tomorrow (UTC) and timelines stay coherent. */
export function demoRelativeOrderDatesEnabled(): boolean {
  const v = process.env.BOOKLY_DEMO_RELATIVE_ORDER_DATES?.toLowerCase();
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on") return true;
  // Netlify sets NETLIFY=true for builds and serverless — keep prototype demos working despite NODE_ENV=production.
  if (process.env.NETLIFY === "true") return true;
  return process.env.NODE_ENV !== "production";
}

function utcCalendarDatePlusDays(days: number): string {
  const now = new Date();
  const t = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + days,
  );
  return new Date(t).toISOString().slice(0, 10);
}

function isoUtcDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export function normalizeOrderRowForDemo(row: OrderRow): OrderRow {
  if (!demoRelativeOrderDatesEnabled()) return row;
  if (row.status !== "in_transit") return row;

  return {
    ...row,
    estimated_delivery: utcCalendarDatePlusDays(1),
    shipped_at: isoUtcDaysAgo(2),
    placed_at: isoUtcDaysAgo(5),
  };
}

export function normalizeOrderRowsForDemo(rows: OrderRow[]): OrderRow[] {
  return rows.map(normalizeOrderRowForDemo);
}
