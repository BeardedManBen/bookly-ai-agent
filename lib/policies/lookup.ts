import topicsJson from "@/content/policies/topics.json";

export type PolicyTopic = {
  id: string;
  title: string;
  body: string;
};

type TopicsFile = { topics: PolicyTopic[] };

const file = topicsJson as TopicsFile;

export function listPolicyTopics(): PolicyTopic[] {
  return file.topics;
}

export function lookupPolicyTopic(query: string): {
  found: boolean;
  topic?: PolicyTopic;
  hint?: string;
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      found: false,
      hint: "Ask with a topic like shipping, returns, or password reset.",
    };
  }

  const exactId = file.topics.find((t) => t.id.toLowerCase() === q);
  if (exactId) return { found: true, topic: exactId };

  const titleHit = file.topics.find((t) => t.title.toLowerCase().includes(q));
  if (titleHit) return { found: true, topic: titleHit };

  const fuzzy = file.topics.find(
    (t) =>
      t.id.toLowerCase().includes(q) ||
      q.includes(t.id.toLowerCase()) ||
      t.body.toLowerCase().includes(q),
  );
  if (fuzzy) return { found: true, topic: fuzzy };

  return {
    found: false,
    hint: `No matching policy topic for “${query}”. Available topics: ${file.topics.map((t) => t.id).join(", ")}.`,
  };
}
