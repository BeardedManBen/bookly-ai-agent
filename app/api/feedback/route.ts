import { NextResponse } from "next/server";
import { insertHistoryMessage } from "@/lib/data/history";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      customerId?: string | null;
      email?: string | null;
      resolved?: boolean | null;
      rating?: number | null;
    };

    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const resolved =
      body.resolved === true || body.resolved === false ? body.resolved : null;
    const rating =
      typeof body.rating === "number" &&
      body.rating >= 1 &&
      body.rating <= 5
        ? body.rating
        : null;

    await insertHistoryMessage({
      sessionId,
      customerId: body.customerId ?? null,
      email: body.email ?? null,
      role: "user",
      content: "[Chat feedback]",
      meta: {
        kind: "csat",
        resolved,
        rating,
        recorded_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
