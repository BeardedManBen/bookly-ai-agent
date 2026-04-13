import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const CAM_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_order_status",
      description:
        "Fetch factual order status for a Bookly order using its public order id (e.g. BK-10428). Use for tracking questions.",
      parameters: {
        type: "object",
        properties: {
          order_public_id: { type: "string" },
        },
        required: ["order_public_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_orders_for_email",
      description:
        "List all orders for the email on file after the customer confirms or provides their Bookly account email. Use for order tracking or returns when they prefer email over typing an order number. If multiple orders exist, summarize each with public_id, status, placed/delivery dates; proactively highlight any in_transit orders first. If the email is not found, say so and offer guest lookup by order number.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_items",
      description:
        "List items on an order. Use before returns to identify which book the customer means.",
      parameters: {
        type: "object",
        properties: {
          order_public_id: { type: "string" },
        },
        required: ["order_public_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_return_refund_status",
      description:
        "Look up existing returns and refund progress for an order (Path B: refund/return status questions). If no returns exist, say so and guide the customer to start a new return. If item_title is provided, narrow to that line item when multiple returns exist.",
      parameters: {
        type: "object",
        properties: {
          order_public_id: { type: "string" },
          item_title: {
            type: "string",
            description: "Optional. Partial match on the book title if the customer named a specific item.",
          },
        },
        required: ["order_public_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_return_eligibility",
      description:
        "Check whether a specific order line item is eligible for return based on stored return rules.",
      parameters: {
        type: "object",
        properties: {
          order_public_id: { type: "string" },
          item_title: {
            type: "string",
            description: "Customer-provided item title (partial match supported).",
          },
        },
        required: ["order_public_id", "item_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_return_request",
      description:
        "Path A: start a new return after confirming eligibility. Creates the return, issues a mock prepaid label URL, sets return to label_sent and refund to requested_not_started. Only call after check_return_eligibility shows eligible=true unless the user explicitly confirms. Explain shipping and that the refund runs after receipt and inspection.",
      parameters: {
        type: "object",
        properties: {
          order_public_id: { type: "string" },
          item_title: { type: "string" },
          reason: { type: "string" },
        },
        required: ["order_public_id", "item_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_policy",
      description:
        "Fetch trusted FAQ/policy text. Use for shipping, returns policy overview, password reset, and other general questions.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "Topic keyword, e.g. shipping, returns, password_reset, contact.",
          },
        },
        required: ["topic"],
      },
    },
  },
];
