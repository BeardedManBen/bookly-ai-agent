import { NextResponse } from "next/server";
import {
  insertHistoryMessage,
  listHistoryForSession,
} from "@/lib/data/history";
import { runCamAgent } from "@/lib/agent/runAgent";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      customerId?: string | null;
      email?: string | null;
      firstName?: string | null;
      userMessage?: string;
      debug?: boolean;
    };

    const sessionId = body.sessionId?.trim();
    const userMessage = body.userMessage?.trim();
    if (!sessionId || !userMessage) {
      return NextResponse.json(
        { error: "sessionId and userMessage are required" },
        { status: 400 },
      );
    }

    const customerId = body.customerId ?? null;
    const email = body.email ?? null;
    const firstName = body.firstName ?? null;

    await insertHistoryMessage({
      sessionId,
      customerId,
      email,
      role: "user",
      content: userMessage,
    });

    const history = await listHistoryForSession(sessionId);
    const { assistantText, toolEvents } = await runCamAgent({
      customerId,
      email,
      firstName,
      history,
    });

    await insertHistoryMessage({
      sessionId,
      customerId,
      email,
      role: "assistant",
      content: assistantText,
      meta: toolEvents.length ? { toolEvents } : null,
    });

    return NextResponse.json({
      reply: assistantText,
      ...(body.debug ? { toolEvents } : {}),
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
