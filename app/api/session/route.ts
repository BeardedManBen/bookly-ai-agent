import { NextResponse } from "next/server";
import { findCustomerByEmail } from "@/lib/data/customers";
import { getLatestOrderForCustomer } from "@/lib/data/orders";
import { insertHistoryMessage } from "@/lib/data/history";
import { buildSessionContext } from "@/lib/greeting";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      isGuest?: boolean;
      email?: string | null;
    };

    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const isGuest = Boolean(body.isGuest);
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const email = rawEmail ? rawEmail.toLowerCase() : "";

    if (!isGuest && (!email || !email.includes("@"))) {
      return NextResponse.json(
        { error: "Valid email is required unless continuing as guest." },
        { status: 400 },
      );
    }

    const customer =
      !isGuest && email ? await findCustomerByEmail(email) : null;
    const latestOrder = customer
      ? await getLatestOrderForCustomer(customer.id)
      : null;

    const ctx = buildSessionContext({
      sessionId,
      customer,
      isGuest,
      submittedEmail: isGuest ? null : email || null,
      latestOrder,
    });

    await insertHistoryMessage({
      sessionId,
      customerId: ctx.customerId,
      email: ctx.email,
      role: "assistant",
      content: ctx.greeting,
      meta: { kind: "session_greeting", greetingKind: ctx.greetingKind },
    });

    return NextResponse.json(ctx);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
