import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { CAM_TOOLS } from "@/lib/agent/toolDefinitions";
import { buildSystemPrompt } from "@/lib/agent/systemPrompt";
import { executeToolCall } from "@/lib/agent/toolExecutor";
import type { ToolDebugEvent } from "@/lib/types";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export async function runCamAgent(input: {
  customerId: string | null;
  email: string | null;
  firstName: string | null;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<{ assistantText: string; toolEvents: ToolDebugEvent[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey });

  const system = buildSystemPrompt({
    customerId: input.customerId,
    email: input.email,
    firstName: input.firstName,
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...input.history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const toolEvents: ToolDebugEvent[] = [];

  for (let i = 0; i < 8; i++) {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: CAM_TOOLS,
      tool_choice: "auto",
      temperature: 0.4,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) throw new Error("No completion choice from OpenAI");

    if (!choice.tool_calls?.length) {
      const text = choice.content?.trim() || "";
      return { assistantText: text, toolEvents };
    }

    messages.push({
      role: "assistant",
      content: choice.content ?? null,
      tool_calls: choice.tool_calls,
    });

    for (const call of choice.tool_calls) {
      if (call.type !== "function") continue;
      const args = call.function.arguments;
      const executed = await executeToolCall({
        name: call.function.name,
        arguments: args,
      });
      toolEvents.push(executed.debug);

      const toolMessage: ChatCompletionToolMessageParam = {
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(executed.result),
      };
      messages.push(toolMessage);
    }
  }

  return {
    assistantText:
      "I’m having trouble finishing that request in this chat. Please try again with your order number, or visit the Support page for policy details.",
    toolEvents,
  };
}
