export type GreetingKind =
  | "in_transit"
  | "delivered_recent"
  | "generic"
  | "unknown_email";

export type SessionContextResponse = {
  sessionId: string;
  customerId: string | null;
  email: string | null;
  firstName: string | null;
  greetingKind: GreetingKind;
  greeting: string;
  latestOrder?: {
    publicId: string;
    status: string;
    estimatedDelivery: string | null;
    deliveredAt: string | null;
    trackingNumber: string | null;
    daysSinceDelivery: number | null;
  };
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ToolDebugEvent = {
  name: string;
  arguments: unknown;
  result: unknown;
};
